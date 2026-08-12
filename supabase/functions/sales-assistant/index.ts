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

function cleanList(value: unknown) {
  return Array.isArray(value) ? value.map(String).map(item => item.trim()).filter(Boolean).slice(0, 8) : [];
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  try {
    const body = await req.json();
    const sessionKey = String(body.sessionKey || '');
    const message = String(body.message || '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(sessionKey)) return json({ error: 'Sessão inválida.' }, 400);
    if (!message || message.length > 1200) return json({ error: 'A mensagem deve ter entre 1 e 1200 caracteres.' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, secretKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let { data: session } = await admin.from('sales_chat_sessions').select('*').eq('session_key', sessionKey).maybeSingle();
    if (!session) {
      const { data, error } = await admin.from('sales_chat_sessions').insert({
        session_key: sessionKey,
        vehicle_id: body.vehicleId || null,
        vehicle_title: String(body.vehicleTitle || '').slice(0, 180) || null,
      }).select('*').single();
      if (error) throw error;
      session = data;
    }

    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { count } = await admin.from('sales_chat_messages').select('id', { count: 'exact', head: true })
      .eq('session_id', session.id).eq('role', 'user').gte('created_at', oneMinuteAgo);
    if ((count || 0) >= 10) return json({ error: 'Muitas mensagens em pouco tempo. Aguarde um instante.' }, 429);

    const { error: userMessageError } = await admin.from('sales_chat_messages').insert({ session_id: session.id, role: 'user', content: message });
    if (userMessageError) throw userMessageError;

    const [{ data: history }, { data: vehicles }, { data: settings }] = await Promise.all([
      admin.from('sales_chat_messages').select('role,content').eq('session_id', session.id).order('created_at', { ascending: false }).limit(14),
      admin.from('vehicles').select('id,brand,model,version,year,mileage,transmission,fuel,color,price,description,status,sold').eq('sold', false).limit(40),
      admin.from('settings').select('company_name,whatsapp,phone,hours,address').limit(1).maybeSingle(),
    ]);

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    let result = {
      reply: `Posso ajudar com informações dos veículos, financiamento e agendamento. Se preferir atendimento humano, toque em “Falar no WhatsApp”.`,
      pain_points: session.pain_points || [], desired_benefits: session.desired_benefits || [], objections: session.objections || [],
      summary: session.commercial_summary || message, lead_score: session.lead_score || 10, status: session.status || 'open',
    };

    if (apiKey) {
      const model = Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash';
      const prompt = `Você é a assistente comercial da ${settings?.company_name || 'Dourado Veículos'}.
Responda em português brasileiro, de forma curta, cordial e útil. Use SOMENTE os dados de estoque e loja fornecidos. Não invente preço, disponibilidade, taxa, garantia ou condição. Quando faltar dado, diga que um vendedor confirmará. Ajude a descobrir uso do carro, orçamento, entrada, troca, urgência, preferências e objeções, fazendo no máximo uma pergunta por resposta. Não pressione. Nunca peça CPF, cartão ou dados sensíveis.
Estoque: ${JSON.stringify(vehicles || [])}
Loja: ${JSON.stringify(settings || {})}
Veículo da página: ${JSON.stringify({ id: body.vehicleId || session.vehicle_id, title: body.vehicleTitle || session.vehicle_title })}
Retorne APENAS JSON válido neste formato: {"reply":"resposta ao cliente","pain_points":["..."],"desired_benefits":["..."],"objections":["..."],"summary":"resumo comercial acumulado para o vendedor","lead_score":0,"status":"open"}. status pode ser open, qualified ou handoff.`;
      const contents = [...(history || [])].reverse().map(item => ({
        role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: item.content }],
      }));
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: prompt }] }, contents, generationConfig: { responseMimeType: 'application/json', temperature: 0.35, maxOutputTokens: 700 } }),
      });
      if (!response.ok) console.error('[sales-assistant] Gemini:', response.status, await response.text());
      else {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('') || '';
        try { result = { ...result, ...JSON.parse(text) }; } catch { if (text) result.reply = text; }
      }
    }

    result.reply = String(result.reply || '').slice(0, 2000);
    const [assistantMessageResult, sessionUpdateResult] = await Promise.all([
      admin.from('sales_chat_messages').insert({ session_id: session.id, role: 'assistant', content: result.reply }),
      admin.from('sales_chat_sessions').update({
        pain_points: cleanList(result.pain_points), desired_benefits: cleanList(result.desired_benefits), objections: cleanList(result.objections),
        commercial_summary: String(result.summary || '').slice(0, 3000), lead_score: Math.max(0, Math.min(100, Number(result.lead_score) || 0)),
        status: ['open', 'qualified', 'handoff'].includes(result.status) ? result.status : 'open',
        customer_name: String(body.customerName || session.customer_name || '').slice(0, 120) || null,
        customer_phone: String(body.customerPhone || session.customer_phone || '').slice(0, 40) || null,
        last_message_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq('id', session.id),
    ]);
    if (assistantMessageResult.error) throw assistantMessageResult.error;
    if (sessionUpdateResult.error) throw sessionUpdateResult.error;

    return json({ reply: result.reply, whatsapp: settings?.whatsapp || settings?.phone || '', leadScore: result.lead_score });
  } catch (error) {
    console.error('[sales-assistant]', error);
    return json({ error: 'Não foi possível responder agora. Tente novamente ou fale pelo WhatsApp.' }, 500);
  }
});
