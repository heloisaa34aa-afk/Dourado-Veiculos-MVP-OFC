import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';

export const adminUsersService = {
  async listUsers() {
    const { data, error } = await supabase.functions.invoke('admin-users', { body: { action: 'list' } });
    if (error || data?.error) throw new Error(data?.error || error?.message || 'Não foi possível carregar os usuários.');
    return (data.users || []) as UserProfile[];
  },

  async createAdmin(input: { name: string; email: string; password: string; phone?: string }) {
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'create', ...input },
    });
    if (error || data?.error) throw new Error(data?.error || error?.message || 'Não foi possível criar a conta administrativa.');
    return data.user as UserProfile;
  },
};
