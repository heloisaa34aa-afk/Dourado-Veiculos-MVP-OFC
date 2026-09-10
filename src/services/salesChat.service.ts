import { supabase } from '../lib/supabase';

export interface SalesChatResponse {
  reply: string;
  whatsapp: string;
  leadScore: number;
  stockCount?: number;
}

export interface SalesChatInsight {
  id: string;
  status: 'open' | 'qualified' | 'handoff' | 'closed';
  customer_name: string | null;
  customer_phone: string | null;
  vehicle_title: string | null;
  pain_points: string[];
  desired_benefits: string[];
  objections: string[];
  commercial_summary: string;
  lead_score: number;
  last_message_at: string;
}

function getSessionKey() {
  const key = 'dourado-sales-chat-session';
  const saved = localStorage.getItem(key);
  if (saved) return saved;
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
}

export const salesChatService = {
  async send(input: { message: string; vehicleId?: string; vehicleTitle?: string; customerName?: string; customerPhone?: string }) {
    const { data, error } = await supabase.functions.invoke('sales-assistant', {
      body: { ...input, sessionKey: getSessionKey() },
    });
    if (error || data?.error) throw new Error(data?.error || error?.message || 'Atendimento indisponível.');
    return data as SalesChatResponse;
  },

  async listInsights() {
    const { data, error } = await supabase.from('sales_chat_sessions').select('*').order('last_message_at', { ascending: false });
    if (error) throw error;
    return (data || []) as SalesChatInsight[];
  },

  async updateStatus(id: string, status: SalesChatInsight['status']) {
    const { error } = await supabase.from('sales_chat_sessions').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },
};
