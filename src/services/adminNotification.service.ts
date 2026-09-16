import { supabase } from '../lib/supabase';

export type AdminNotificationTarget = 'quotes' | 'messages' | 'salesChat';

export interface AdminNotificationItem {
  id: string;
  eventType: 'quote' | 'lead' | 'ai_chat';
  title: string;
  message: string;
  customerName: string;
  customerPhone: string;
  vehicleTitle: string;
  targetSection: AdminNotificationTarget;
  createdAt: string;
}

function mapNotification(row: any): AdminNotificationItem {
  return {
    id: row.id,
    eventType: row.event_type,
    title: row.title,
    message: row.message,
    customerName: row.customer_name || '',
    customerPhone: row.customer_phone || '',
    vehicleTitle: row.vehicle_title || '',
    targetSection: row.target_section || 'messages',
    createdAt: row.created_at,
  };
}

export const adminNotificationService = {
  async listRecent(limit = 30) {
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(mapNotification);
  },

  subscribe(onNotification: (item: AdminNotificationItem) => void) {
    const channel = supabase
      .channel(`admin-commercial-notifications-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_notifications' }, payload => onNotification(mapNotification(payload.new)))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'admin_notifications' }, payload => onNotification(mapNotification(payload.new)))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  },
};
