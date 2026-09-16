-- ===== 1) الأدوار وحماية المالك =====
create type public.app_role as enum ('owner','admin','editor','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table public.profiles (
  id uuid primary key,
  display_name text,
  avatar_url text,
  last_seen_at timestamptz,
  banned boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('owner','admin')
  )
$$;

create or replace function public.claim_ownership()
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); uemail text;
begin
  if uid is null then return 'unauthenticated'; end if;
  select lower(email) into uemail from auth.users where id = uid;
  if uemail is distinct from 'lmodirv@gmail.com' then return 'not_owner_email'; end if;
  perform set_config('app.owner_claim', 'true', true);
  insert into public.user_roles(user_id, role) values (uid, 'owner') on conflict do nothing;
  insert into public.profiles(id, display_name) values (uid, 'المالك') on conflict (id) do nothing;
  return 'ok';
end $$;

create or replace function public.protect_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' and old.role = 'owner' then
    raise exception 'لا يمكن حذف دور المالك';
  end if;
  if tg_op = 'UPDATE' and old.role = 'owner' and new.role is distinct from 'owner' then
    raise exception 'لا يمكن تخفيض أو تغيير دور المالك';
  end if;
  if tg_op = 'INSERT' and new.role = 'owner'
     and coalesce(current_setting('app.owner_claim', true), '') <> 'true' then
    raise exception 'لا يمكن منح دور المالك إلا تلقائياً عبر claim_ownership';
  end if;
  return coalesce(new, old);
end $$;

create trigger protect_owner_roles
before insert or update or delete on public.user_roles
for each row execute function public.protect_owner();

create or replace function public.set_user_role(_user_id uuid, _role public.app_role)
returns text language plpgsql security definer set search_path = public as $$
declare caller uuid := auth.uid();
begin
  if caller is null then raise exception 'unauthenticated'; end if;
  if not public.has_role(caller, 'owner') then
    raise exception 'فقط المالك يمكنه إدارة الأدوار';
  end if;
  if _role = 'owner' then raise exception 'لا يمكن منح دور المالك'; end if;
  if _user_id = caller then raise exception 'لا يمكن تغيير دورك'; end if;
  if _role = 'user' then
    delete from public.user_roles where user_id = _user_id and role <> 'user';
    insert into public.user_roles(user_id, role) values (_user_id, 'user') on conflict do nothing;
  else
    delete from public.user_roles where user_id = _user_id;
    insert into public.user_roles(user_id, role) values (_user_id, _role);
  end if;
  return 'ok';
end $$;

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
grant select on public.profiles to authenticated;
grant insert on public.profiles to authenticated;
grant update on public.profiles to authenticated;
grant all on public.profiles to service_role;
grant execute on function public.claim_ownership() to authenticated;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

alter table public.user_roles enable row level security;
alter table public.profiles enable row level security;

create policy "read own or staff roles" on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "read own profile" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_staff(auth.uid()));
create policy "upsert own profile" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid());
create policy "staff update profiles" on public.profiles
  for update to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- ===== 2) جداول المنصة =====
create table public.hn_services (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  url text not null,
  capabilities text[] not null default '{}',
  enabled boolean not null default true,
  priority int not null default 100,
  created_at timestamptz not null default now()
);

create table public.hn_service_health (
  id uuid primary key default gen_random_uuid(),
  service_key text not null,
  ok boolean not null,
  latency_ms int,
  error text,
  checked_at timestamptz not null default now()
);

create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  kind text not null,
  prompt text,
  service_key text,
  status text not null default 'running',
  duration_ms int,
  result_summary text,
  error text,
  created_at timestamptz not null default now()
);

create index generation_jobs_user_created_idx on public.generation_jobs (user_id, created_at);
create index generation_jobs_kind_idx on public.generation_jobs (kind);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action text not null,
  entity text,
  job_id uuid,
  request_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index activity_logs_created_idx on public.activity_logs (created_at);

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  title text not null,
  body text not null,
  tags text[] not null default '{}',
  usage_count int not null default 0,
  archived boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table public.usage_quotas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  role public.app_role,
  period text not null check (period in ('day','month')),
  limit_count int not null,
  unique (user_id, role, period)
);

create table public.knowledge_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  intent text not null,
  prompt text,
  service_key text,
  prompt_template text,
  result_summary text,
  rating int,
  embedding jsonb,
  ok boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.feedback_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid,
  user_id uuid,
  kind text not null check (kind in ('like','dislike','regenerate')),
  created_at timestamptz not null default now()
);

create table public.model_policies (
  id uuid primary key default gen_random_uuid(),
  intent text not null,
  service_key text not null,
  prompt_template text,
  success_rate numeric not null default 0,
  uses int not null default 0,
  weight numeric not null default 1,
  updated_at timestamptz not null default now(),
  unique (intent, service_key)
);

-- ===== 3) GRANT + RLS =====
grant select on public.hn_services to authenticated;
grant all on public.hn_services to service_role;
grant select on public.hn_service_health to authenticated;
grant insert on public.hn_service_health to authenticated;
grant all on public.hn_service_health to service_role;
grant select on public.platform_settings to authenticated;
grant all on public.platform_settings to service_role;
grant select, insert, update on public.generation_jobs to authenticated;
grant all on public.generation_jobs to service_role;
grant select, insert on public.activity_logs to authenticated;
grant all on public.activity_logs to service_role;
grant select on public.templates to authenticated;
grant insert on public.templates to authenticated;
grant all on public.templates to service_role;
grant select on public.usage_quotas to authenticated;
grant all on public.usage_quotas to service_role;
grant select, insert, update on public.knowledge_items to authenticated;
grant all on public.knowledge_items to service_role;
grant select, insert on public.feedback_events to authenticated;
grant all on public.feedback_events to service_role;
grant select on public.model_policies to authenticated;
grant all on public.model_policies to service_role;

alter table public.hn_services enable row level security;
alter table public.hn_service_health enable row level security;
alter table public.platform_settings enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.activity_logs enable row level security;
alter table public.templates enable row level security;
alter table public.usage_quotas enable row level security;
alter table public.knowledge_items enable row level security;
alter table public.feedback_events enable row level security;
alter table public.model_policies enable row level security;

create policy "services readable" on public.hn_services
  for select to authenticated using (true);
create policy "services staff write" on public.hn_services
  for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create policy "health readable" on public.hn_service_health
  for select to authenticated using (true);
create policy "health staff insert" on public.hn_service_health
  for insert to authenticated with check (public.is_staff(auth.uid()));

create policy "settings readable" on public.platform_settings
  for select to authenticated using (true);
create policy "settings staff write" on public.platform_settings
  for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create policy "jobs read own or staff" on public.generation_jobs
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "jobs insert own" on public.generation_jobs
  for insert to authenticated with check (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "jobs staff update" on public.generation_jobs
  for update to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));

create policy "logs staff read" on public.activity_logs
  for select to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "logs insert own" on public.activity_logs
  for insert to authenticated with check (user_id = auth.uid() or public.is_staff(auth.uid()));

create policy "templates readable" on public.templates
  for select to authenticated using (not archived or public.is_staff(auth.uid()));
create policy "templates staff write" on public.templates
  for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "templates user insert" on public.templates
  for insert to authenticated with check (created_by = auth.uid());

create policy "quotas readable" on public.usage_quotas
  for select to authenticated using (true);

create policy "knowledge read own or staff" on public.knowledge_items
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "knowledge insert own" on public.knowledge_items
  for insert to authenticated with check (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "knowledge staff update" on public.knowledge_items
  for update to authenticated using (public.is_staff(auth.uid()));

create policy "feedback read own or staff" on public.feedback_events
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "feedback insert own" on public.feedback_events
  for insert to authenticated with check (user_id = auth.uid());

create policy "policies readable" on public.model_policies
  for select to authenticated using (true);
