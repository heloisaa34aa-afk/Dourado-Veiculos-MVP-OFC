import { useCallback, useEffect, useState } from 'react';
import { Brain, Loader2, MessageCircle, Phone, RefreshCw, Target } from 'lucide-react';
import { salesChatService, SalesChatInsight } from '../services/salesChat.service';

export function SalesChatInsights() {
  const [items, setItems] = useState<SalesChatInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setLoading(true); setError(''); setItems(await salesChatService.listInsights()); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível carregar as conversas.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div>;
  return <div className="space-y-5">
    <div className="flex items-center justify-between"><div><h3 className="text-xl font-extrabold text-slate-900">Inteligência comercial das conversas</h3><p className="text-xs text-slate-500">Resumo gerado durante o atendimento para o vendedor abordar cada cliente com contexto.</p></div><button onClick={() => void load()} className="rounded-xl bg-slate-900 p-2.5 text-white"><RefreshCw className="h-4 w-4" /></button></div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} Execute a migration do chat e publique a Edge Function.</div>}
    {!error && items.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500"><MessageCircle className="mx-auto mb-3 h-10 w-10" />As conversas qualificadas aparecerão aqui.</div>}
    <div className="grid gap-4 xl:grid-cols-2">{items.map(item => <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3"><div><h4 className="font-extrabold text-slate-900">{item.customer_name || 'Visitante não identificado'}</h4><p className="text-xs font-semibold text-red-600">{item.vehicle_title || 'Interesse geral no estoque'}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-black ${item.lead_score >= 70 ? 'bg-emerald-100 text-emerald-700' : item.lead_score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{item.lead_score}% intenção</span></div>
      <div className="rounded-2xl bg-slate-50 p-4"><p className="mb-1 flex items-center gap-1.5 text-xs font-extrabold uppercase text-slate-500"><Brain className="h-3.5 w-3.5" />Resumo para abordagem</p><p className="text-sm leading-relaxed text-slate-700">{item.commercial_summary || 'A conversa ainda não possui contexto suficiente.'}</p></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><Insight title="Dores e necessidades" values={item.pain_points} /><Insight title="Benefícios valorizados" values={item.desired_benefits} /><Insight title="Objeções" values={item.objections} /></div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><select value={item.status} onChange={async e => { await salesChatService.updateStatus(item.id, e.target.value as SalesChatInsight['status']); await load(); }} className="rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-bold"><option value="open">Aberto</option><option value="qualified">Qualificado</option><option value="handoff">Vendedor acionado</option><option value="closed">Encerrado</option></select>{item.customer_phone ? <a href={`https://wa.me/${item.customer_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><Phone className="h-3.5 w-3.5" />WhatsApp</a> : <span className="text-[11px] text-slate-400">Telefone ainda não informado</span>}</div>
    </article>)}</div>
  </div>;
}

function Insight({ title, values }: { title: string; values: string[] }) { if (!values?.length) return null; return <div><p className="mb-1 flex items-center gap-1 text-[11px] font-extrabold uppercase text-slate-500"><Target className="h-3 w-3" />{title}</p><div className="flex flex-wrap gap-1">{values.map(value => <span key={value} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-700">{value}</span>)}</div></div>; }
