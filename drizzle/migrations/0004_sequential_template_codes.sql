-- معرّفات القوالب تصبح تسلسلية: S00001 ثم S00002 ...
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn FROM public.templates
)
UPDATE public.templates t
SET code = 'S' || lpad(o.rn::text, 5, '0')
FROM ordered o
WHERE t.id = o.id;

CREATE SEQUENCE IF NOT EXISTS public.template_code_seq START 13;

CREATE OR REPLACE FUNCTION public.gen_template_code()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'S' || lpad(nextval('public.template_code_seq')::text, 5, '0')
$$;