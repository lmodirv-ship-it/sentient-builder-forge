CREATE TABLE public.admin_panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  icon text,
  description text,
  sort_order integer NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  builtin boolean NOT NULL DEFAULT false,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_panels TO authenticated;
GRANT ALL ON public.admin_panels TO service_role;

ALTER TABLE public.admin_panels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "panels readable" ON public.admin_panels
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "panels staff write" ON public.admin_panels
  FOR ALL TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

GRANT INSERT, UPDATE, DELETE ON public.admin_panels TO authenticated;