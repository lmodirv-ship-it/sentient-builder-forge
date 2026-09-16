CREATE OR REPLACE FUNCTION public.gen_template_code()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT 's' || lpad((floor(random() * 1000000))::int::text, 6, '0')
$$;

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS code text DEFAULT public.gen_template_code();

UPDATE public.templates SET code = public.gen_template_code() WHERE code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS templates_code_key ON public.templates (code);