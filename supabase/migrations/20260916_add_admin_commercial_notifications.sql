BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('quote', 'lead', 'ai_chat')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  vehicle_title TEXT,
  source_id UUID NOT NULL,
  target_section TEXT NOT NULL CHECK (target_section IN ('quotes', 'messages', 'salesChat')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at
  ON public.admin_notifications(created_at DESC);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read commercial notifications" ON public.admin_notifications;
CREATE POLICY "Admins read commercial notifications" ON public.admin_notifications
FOR SELECT TO authenticated USING (public.current_user_is_admin());

REVOKE ALL ON public.admin_notifications FROM anon;
GRANT SELECT ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;

CREATE OR REPLACE FUNCTION public.notify_admin_new_quote()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE v_vehicle_title TEXT;
BEGIN
  SELECT trim(concat_ws(' ', brand, model, version)) INTO v_vehicle_title FROM public.vehicles WHERE id = NEW.vehicle_id;
  INSERT INTO public.admin_notifications(event_type, title, message, customer_name, customer_phone, vehicle_id, vehicle_title, source_id, target_section)
  VALUES (
    'quote', 'Nova simulação de financiamento',
    concat(coalesce(NEW.name, 'Cliente'), ' solicitou condições', CASE WHEN v_vehicle_title IS NOT NULL THEN concat(' para ', v_vehicle_title) ELSE '' END, '. Telefone: ', coalesce(NEW.phone, 'não informado'), '.'),
    NEW.name, NEW.phone, NEW.vehicle_id, v_vehicle_title, NEW.id, 'quotes'
  ) ON CONFLICT (event_type, source_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_admin_new_lead()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE v_vehicle_title TEXT;
BEGIN
  SELECT trim(concat_ws(' ', brand, model, version)) INTO v_vehicle_title FROM public.vehicles WHERE id = NEW.vehicle_id;
  INSERT INTO public.admin_notifications(event_type, title, message, customer_name, customer_phone, vehicle_id, vehicle_title, source_id, target_section)
  VALUES (
    'lead', 'Novo interesse em veículo',
    concat(coalesce(NEW.name, 'Cliente'), ' enviou uma solicitação', CASE WHEN v_vehicle_title IS NOT NULL THEN concat(' sobre ', v_vehicle_title) ELSE '' END, '. ', left(coalesce(NEW.message, ''), 180)),
    NEW.name, NEW.phone, NEW.vehicle_id, v_vehicle_title, NEW.id, 'messages'
  ) ON CONFLICT (event_type, source_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_admin_ai_conversation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
BEGIN
  IF (NEW.customer_name IS NOT NULL OR NEW.customer_phone IS NOT NULL)
     AND (NEW.vehicle_title IS NOT NULL OR NEW.lead_score >= 30) THEN
    INSERT INTO public.admin_notifications(event_type, title, message, customer_name, customer_phone, vehicle_id, vehicle_title, source_id, target_section)
    VALUES (
      'ai_chat', 'Conversa relevante com a assistente',
      concat(coalesce(NEW.customer_name, 'Cliente'), CASE WHEN NEW.vehicle_title IS NOT NULL THEN concat(' perguntou sobre ', NEW.vehicle_title) ELSE ' conversou sobre o estoque' END, '. Intenção: ', NEW.lead_score, '%. ', left(coalesce(NEW.commercial_summary, ''), 220)),
      NEW.customer_name, NEW.customer_phone, NEW.vehicle_id, NEW.vehicle_title, NEW.id, 'salesChat'
    ) ON CONFLICT (event_type, source_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_new_quote ON public.quotes;
CREATE TRIGGER trg_notify_admin_new_quote AFTER INSERT ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_quote();

DROP TRIGGER IF EXISTS trg_notify_admin_new_lead ON public.leads;
CREATE TRIGGER trg_notify_admin_new_lead AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_lead();

DROP TRIGGER IF EXISTS trg_notify_admin_ai_conversation ON public.sales_chat_sessions;
CREATE TRIGGER trg_notify_admin_ai_conversation AFTER UPDATE ON public.sales_chat_sessions
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_ai_conversation();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;
