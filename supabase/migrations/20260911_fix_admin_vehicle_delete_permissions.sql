BEGIN;

GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT ON TABLE public.admins TO service_role;
GRANT SELECT, DELETE ON TABLE public.vehicles TO service_role;
GRANT SELECT ON TABLE public.vehicle_360_projects TO service_role;

DO $$
BEGIN
  IF to_regclass('public.vehicle_360_capture_sessions') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.vehicle_360_capture_sessions TO service_role;
  END IF;
END
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
