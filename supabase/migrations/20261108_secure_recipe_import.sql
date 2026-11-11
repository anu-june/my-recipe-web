-- Shared limit: at most 10 imports per administrator per 10-minute window.
-- Run after the existing RLS migration. No service-role key is needed by the app.
CREATE TABLE IF NOT EXISTS public.recipe_import_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  attempts integer NOT NULL
);
ALTER TABLE public.recipe_import_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.recipe_import_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_recipe_import()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  used integer;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.is_admin(), false) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.recipe_import_limits AS limits (user_id, window_start, attempts)
  VALUES (auth.uid(), statement_timestamp(), 1)
  ON CONFLICT (user_id) DO UPDATE SET
    attempts = CASE WHEN limits.window_start <= statement_timestamp() - interval '10 minutes' THEN 1 ELSE limits.attempts + 1 END,
    window_start = CASE WHEN limits.window_start <= statement_timestamp() - interval '10 minutes' THEN statement_timestamp() ELSE limits.window_start END
  WHERE limits.window_start <= statement_timestamp() - interval '10 minutes' OR limits.attempts < 10
  RETURNING attempts INTO used;
  RETURN used IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_recipe_import() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_recipe_import() TO authenticated;

-- Model telemetry is not needed by the application. Prevent public insertion
-- and restrict any existing sensitive events to administrators.
DROP POLICY IF EXISTS "Enable insert for all users" ON public.model_events;
DROP POLICY IF EXISTS "Enable read for authenticated users only" ON public.model_events;
DROP POLICY IF EXISTS "Admin can read model events" ON public.model_events;
CREATE POLICY "Admin can read model events" ON public.model_events
  FOR SELECT TO authenticated USING (public.is_admin());
REVOKE INSERT, UPDATE, DELETE ON public.model_events FROM anon, authenticated;
