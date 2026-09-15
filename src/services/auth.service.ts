import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

async function getProfile(): Promise<UserProfile | null> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.user) return null;

  const user = session.user;
  const { data: adminData } = await supabase
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  const role: UserProfile['role'] = adminData ? 'admin' : 'client';

  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || '',
    phone: user.user_metadata?.phone || '',
    city: user.user_metadata?.city || '',
    role,
  };
}

export const authService = {
  getProfile,

  onAuthStateChange(callback: (profile: UserProfile | null) => void) {
    const { data } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => {
        void getProfile().then(callback).catch(() => undefined);
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  },

  async signUp(email: string, password: string, metadata: { name: string; phone: string; city: string }): Promise<UserProfile> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: metadata.name,
          phone: metadata.phone,
          city: metadata.city
        }
      }
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('Falha ao criar conta de usuário.');
    }

    return {
      id: data.user.id,
      email: data.user.email || email,
      name: metadata.name,
      phone: metadata.phone,
      city: metadata.city,
      role: 'client'
    };
  },

  async signIn(email: string, password: string): Promise<UserProfile> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('Falha na autenticação.');
    }

    // Check if admin
    const { data: adminData } = await supabase
      .from('admins')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    const role = adminData ? 'admin' : 'client';
    const name = data.user.user_metadata?.name || data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || '';
    const phone = data.user.user_metadata?.phone || '';
    const city = data.user.user_metadata?.city || '';

    return {
      id: data.user.id,
      email: data.user.email || email,
      name,
      phone,
      city,
      role
    };
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }
};
