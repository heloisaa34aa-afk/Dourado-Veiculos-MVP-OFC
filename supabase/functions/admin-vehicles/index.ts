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

async function removeFolder(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  folder: string,
) {
  const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 1000 });
  if (error || !data?.length) return;
  const paths = data.filter(item => item.id).map(item => `${folder}/${item.name}`);
  if (paths.length) await admin.storage.from(bucket).remove(paths);
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
    if (permissionError || !permission) return json({ error: 'Sua conta não tem permissão para excluir veículos.' }, 403);

    const body = await request.json();
    const vehicleId = String(body.vehicleId || '');
    if (body.action !== 'delete' || !/^[0-9a-f-]{36}$/i.test(vehicleId)) {
      return json({ error: 'Solicitação de exclusão inválida.' }, 400);
    }

    const [{ data: projects, error: projectsError }, { data: sessions, error: sessionsError }] = await Promise.all([
      admin.from('vehicle_360_projects').select('id').eq('vehicle_id', vehicleId),
      admin.from('vehicle_360_capture_sessions').select('id').eq('vehicle_id', vehicleId),
    ]);
    // Capture sessions may not exist in installations that have not enabled QR capture yet.
    if (projectsError) throw projectsError;
    if (sessionsError && sessionsError.code !== '42P01') console.warn('[admin-vehicles] capture sessions lookup', sessionsError);

    const { data: removed, error: deleteError } = await admin
      .from('vehicles')
      .delete()
      .eq('id', vehicleId)
      .select('id')
      .maybeSingle();
    if (deleteError) throw deleteError;
    if (!removed) return json({ error: 'Veículo não encontrado ou já excluído.' }, 404);

    const cleanup = [
      removeFolder(admin, 'vehicles', `${vehicleId}/cover`),
      removeFolder(admin, 'vehicles', `${vehicleId}/gallery`),
      removeFolder(admin, 'vehicles', `${vehicleId}/videos`),
      ...(projects || []).flatMap(project => [
        removeFolder(admin, 'vehicles', `360/${vehicleId}/${project.id}/frames`),
        removeFolder(admin, 'vehicles', `360/${vehicleId}/${project.id}/hotspots`),
        removeFolder(admin, 'vehicles', `360/${vehicleId}/${project.id}/damages`),
      ]),
      ...(sessions || []).map(session => removeFolder(admin, 'vehicles', `360-capture/${session.id}`)),
    ];
    await Promise.allSettled(cleanup);

    return json({ deleted: true, vehicleId });
  } catch (error) {
    console.error('[admin-vehicles]', error);
    const message = error instanceof Error ? error.message : 'Não foi possível excluir o veículo.';
    return json({ error: message }, 500);
  }
});
