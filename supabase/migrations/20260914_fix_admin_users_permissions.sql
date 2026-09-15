BEGIN;

-- admin-users validates the caller and then uses the service role to create
-- and roll back administrator records. RLS bypass does not replace grants.
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, DELETE ON TABLE public.admins TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
