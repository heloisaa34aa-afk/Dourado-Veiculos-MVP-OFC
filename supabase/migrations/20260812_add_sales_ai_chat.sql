BEGIN;

CREATE TABLE IF NOT EXISTS public.sales_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'qualified', 'handoff', 'closed')),
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  vehicle_title TEXT,
  pain_points TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  desired_benefits TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  objections TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  commercial_summary TEXT NOT NULL DEFAULT '',
  lead_score INTEGER NOT NULL DEFAULT 0 CHECK (lead_score BETWEEN 0 AND 100),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sales_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_chat_sessions_last_message ON public.sales_chat_sessions(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_chat_messages_session ON public.sales_chat_messages(session_id, created_at);

ALTER TABLE public.sales_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$ SELECT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid()); $$;
REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

DROP POLICY IF EXISTS "Admins manage sales chat sessions" ON public.sales_chat_sessions;
CREATE POLICY "Admins manage sales chat sessions" ON public.sales_chat_sessions
FOR ALL TO authenticated
USING (public.current_user_is_admin())
WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins read sales chat messages" ON public.sales_chat_messages;
CREATE POLICY "Admins read sales chat messages" ON public.sales_chat_messages
FOR SELECT TO authenticated
USING (public.current_user_is_admin());

REVOKE ALL ON public.sales_chat_sessions, public.sales_chat_messages FROM anon;
GRANT SELECT, UPDATE, DELETE ON public.sales_chat_sessions TO authenticated;
GRANT SELECT ON public.sales_chat_messages TO authenticated;
GRANT ALL ON public.sales_chat_sessions, public.sales_chat_messages TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
