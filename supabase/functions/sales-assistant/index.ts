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

type StockVehicle = {
  id: string;
  brand?: string;
  model?: string;
  version?: string;
  year?: number;
  mileage?: number;
  transmission?: string;
  fuel?: string;
  color?: string;
  price?: number;
};

function vehicleName(vehicle: StockVehicle) {
  return [vehicle.brand, vehicle.model, vehicle.version].filter(Boolean).join(' ');
}

function formatPrice(value?: number) {
  return typeof value === 'number'
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
    : null;
}

function catalogFallback(message: string, vehicles: StockVehicle[], vehicleId?: string | null) {
  const normalized = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const selectedVehicle = vehicleId ? vehicles.find(vehicle => vehicle.id === vehicleId) : undefined;
  const asksForAutomatic = /automatic|automatizado|sem embreagem/.test(normalized);
  const asksForFinancing = /financ|parcela|entrada|credito/.test(normalized);
  const asksForTrade = /troca|meu carro|usado como entrada/.test(normalized);
  const asksForPrice = /preco|valor|quanto custa|custa/.test(normalized);

  if (selectedVehicle) {
    const details = [
      selectedVehicle.year ? `ano ${selectedVehicle.year}` : '',
      selectedVehicle.transmission || '',
      formatPrice(selectedVehicle.price) || '',
    ].filter(Boolean).join(', ');
    if (asksForPrice) return `O ${vehicleName(selectedVehicle)} está anunciado por ${formatPrice(selectedVehicle.price) || 'valor sob consulta'}. Quer que eu explique as opções de financiamento ou prefere saber mais sobre o carro?`;
    return `Você está vendo o ${vehicleName(selectedVehicle)}${details ? ` (${details})` : ''}. Posso tirar dúvidas sobre esse modelo, comparar com outro do estoque ou ajudar a estimar o perfil de financiamento. O que é mais importante para você?`;
  }

  if (asksForFinancing) {
    return 'Consigo ajudar a encontrar carros compatíveis com a parcela e a entrada que você pretende dar. Qual faixa de entrada ou de parcela mensal fica confortável para você?';
  }

  if (asksForTrade) {
    return 'Seu carro pode ser avaliado para entrar na negociação. Para eu orientar melhor, qual é o modelo, ano e quilometragem aproximada dele?';
  }

  let matches = vehicles;
  if (asksForAutomatic) {
    matches = vehicles.filter(vehicle => /automatic|cvt|dct/.test(String(vehicle.transmission || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()));
  }

  const suggestions = matches.slice(0, 3).map(vehicle => {
    const facts = [vehicle.year, vehicle.transmission, formatPrice(vehicle.price)].filter(Boolean).join(' • ');
    return `${vehicleName(vehicle)}${facts ? ` — ${facts}` : ''}`;
  });

  if (suggestions.length) {
    return `Encontrei ${suggestions.length === 1 ? 'uma opção' : 'algumas opções'} no estoque que combinam com o que você procura:\n\n${suggestions.map(item => `• ${item}`).join('\n')}\n\nQual delas chamou mais sua atenção ou qual faixa de preço você pretende investir?`;
  }

  return 'Para eu indicar um carro que realmente combine com você, me conte primeiro: qual uso será mais frequente — cidade, trabalho, família ou viagens?';
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
      admin.from('vehicles').select('id,brand,model,version,year,mileage,transmission,fuel,color,price,status,sold').eq('sold', false).limit(24),
      admin.from('settings').select('company_name,whatsapp,phone,hours,address').limit(1).maybeSingle(),
    ]);

    const stock = (vehicles || []) as StockVehicle[];
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    let result = {
      reply: catalogFallback(message, stock, body.vehicleId || session.vehicle_id),
      pain_points: session.pain_points || [], desired_benefits: session.desired_benefits || [], objections: session.objections || [],
      summary: session.commercial_summary || message, lead_score: session.lead_score || 10, status: session.status || 'open',
    };

    if (apiKey) {
      const model = Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash-lite';
      const prompt = `Você é a assistente comercial da ${settings?.company_name || 'Dourado Veículos'}.
Atue como uma consultora de vendas atenciosa e conhecedora de carros, não como um menu de atendimento. Responda em português brasileiro, com naturalidade, em até 120 palavras. Entenda a necessidade, responda primeiro ao que foi perguntado e faça no máximo uma pergunta relevante por mensagem.
Quando o cliente pedir recomendação, cite de 1 a 3 veículos REAIS do estoque e explique brevemente por que combinam com o uso informado. Se ele estiver na página de um veículo, priorize esse carro. Use SOMENTE os dados fornecidos. Não invente disponibilidade, preço, parcela, taxa, garantia, avaliação ou condição comercial.
Não mencione WhatsApp, atendimento humano ou vendedor em todas as respostas. Ofereça encaminhamento somente quando o cliente pedir contato, quiser agendar, estiver pronto para negociar ou quando uma informação comercial precisar de confirmação. Nunca peça CPF, cartão ou dados sensíveis.
Estoque: ${JSON.stringify(stock)}
Loja: ${JSON.stringify(settings || {})}
Veículo da página: ${JSON.stringify({ id: body.vehicleId || session.vehicle_id, title: body.vehicleTitle || session.vehicle_title })}
Retorne APENAS JSON válido neste formato: {"reply":"resposta ao cliente","pain_points":["..."],"desired_benefits":["..."],"objections":["..."],"summary":"resumo comercial acumulado para o vendedor","lead_score":0,"status":"open"}. status pode ser open, qualified ou handoff.`;
      const contents = [...(history || [])].reverse().map(item => ({
        role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: item.content }],
      }));
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          signal: AbortSignal.timeout(5000),
          body: JSON.stringify({ systemInstruction: { parts: [{ text: prompt }] }, contents, generationConfig: { responseMimeType: 'application/json', temperature: 0.3, maxOutputTokens: 350 } }),
        });
        if (!response.ok) console.error('[sales-assistant] Gemini:', response.status, await response.text());
        else {
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('') || '';
          try { result = { ...result, ...JSON.parse(text) }; } catch { if (text) result.reply = text; }
        }
      } catch (providerError) {
        console.error('[sales-assistant] Gemini timeout/error:', providerError);
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
