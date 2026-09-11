import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, 'Content-Type': 'application/json' },
});

function secretKey() {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
  return keys.default;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  try {
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Entre novamente no painel administrativo.' }, 401);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, secretKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return json({ error: 'Sessão administrativa inválida.' }, 401);

    const { data: permission, error: permissionError } = await admin
      .from('admins')
      .select('id')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (permissionError || !permission) return json({ error: 'Sua conta não tem permissão para criar administradores.' }, 403);

    const body = await request.json();
    if (body.action === 'list') {
      const [{ data: usersData, error: usersError }, { data: adminRows, error: adminsError }] = await Promise.all([
        admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
        admin.from('admins').select('id'),
      ]);
      if (usersError || adminsError) throw usersError || adminsError;
      const adminIds = new Set((adminRows || []).map((row: { id: string }) => row.id));
      return json({ users: usersData.users.map(user => ({
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
        phone: user.user_metadata?.phone || '',
        city: user.user_metadata?.city || '',
        role: adminIds.has(user.id) ? 'admin' : 'client',
        isActive: !user.banned_until,
      })) });
    }

    if (body.action !== 'create') return json({ error: 'Ação inválida.' }, 400);
    const name = String(body.name || '').trim().slice(0, 120);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const phone = String(body.phone || '').trim().slice(0, 40);
    if (name.length < 2) return json({ error: 'Informe o nome do administrador.' }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Informe um e-mail válido.' }, 400);
    if (password.length < 8) return json({ error: 'A senha deve ter pelo menos 8 caracteres.' }, 400);

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone },
    });
    if (createError || !created.user) throw createError || new Error('Conta não criada.');

    const { error: roleError } = await admin.from('admins').insert({
      id: created.user.id,
      name,
      role: 'admin',
    });
    if (roleError) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw roleError;
    }

    return json({ user: { id: created.user.id, email, name, phone, city: '', role: 'admin', isActive: true } });
  } catch (error) {
    console.error('[admin-users]', error);
    const message = error instanceof Error ? error.message : 'Não foi possível criar a conta administrativa.';
    return json({ error: message }, 500);
  }
});
