import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';

async function functionErrorMessage(error: any, fallback: string) {
  const response = error?.context;
  if (response && typeof response.clone === 'function') {
    try {
      const payload = await response.clone().json();
      if (payload?.error) return payload.error;
    } catch {
      // Keep the stable fallback when the function did not return JSON.
    }
  }
  return error?.message || fallback;
}

export const adminUsersService = {
  async listUsers() {
    const { data, error } = await supabase.functions.invoke('admin-users', { body: { action: 'list' } });
    if (error || data?.error) throw new Error(data?.error || await functionErrorMessage(error, 'Não foi possível carregar os usuários.'));
    return (data.users || []) as UserProfile[];
  },

  async createAdmin(input: { name: string; email: string; password: string; phone?: string }) {
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'create', ...input },
    });
    if (error || data?.error) throw new Error(data?.error || await functionErrorMessage(error, 'Não foi possível criar a conta administrativa.'));
    return data.user as UserProfile;
  },
};
