import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, ChevronDown, Loader2, MessageCircle, Send, X } from 'lucide-react';
import type { Car } from '../types';
import { salesChatService } from '../services/salesChat.service';
import { settingsService } from '../services/settings.service';

interface ChatMessage { role: 'user' | 'assistant'; content: string }

function splitAssistantReply(reply: string) {
  const paragraphs = reply.split(/\n{2,}/).map(item => item.trim()).filter(Boolean);
  if (paragraphs.length > 1) return paragraphs.slice(0, 4);
  if (reply.length < 260) return [reply.trim()];
  const sentences = reply.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(item => item.trim()).filter(Boolean) || [reply];
  const chunks: string[] = [];
  for (const sentence of sentences) {
    const last = chunks[chunks.length - 1];
    if (last && `${last} ${sentence}`.length <= 230) chunks[chunks.length - 1] = `${last} ${sentence}`;
    else chunks.push(sentence);
  }
  return chunks.slice(0, 4);
}

export function SalesAssistantChat({ vehicle }: { vehicle?: Car }) {
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<string[]>([]);
  const batchTimerRef = useRef<number | null>(null);
  const requestInFlightRef = useRef(false);

  useEffect(() => {
    let active = true;
    void settingsService.getSettings()
      .then(settings => { if (active) setWhatsapp(settings.whatsapp || settings.phone || ''); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const vehicleTitle = vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.version}`.trim() : undefined;
  const whatsappUrl = useMemo(() => {
    const number = whatsapp.replace(/\D/g, '');
    const summary = messages.slice(-6).map(item => `${item.role === 'user' ? 'Cliente' : 'Assistente'}: ${item.content}`).join('\n');
    return number ? `https://wa.me/${number.startsWith('55') ? number : `55${number}`}?text=${encodeURIComponent(`Olá, vim pelo site da Dourado Veículos.${vehicleTitle ? ` Tenho interesse no ${vehicleTitle}.` : ''}\n\nResumo da conversa:\n${summary}`)}` : '#';
  }, [messages, vehicleTitle, whatsapp]);

  useEffect(() => () => {
    if (batchTimerRef.current !== null) window.clearTimeout(batchTimerRef.current);
  }, []);

  const processPending = async () => {
    if (requestInFlightRef.current || pendingRef.current.length === 0) return;
    const batchedMessages = pendingRef.current.splice(0);
    requestInFlightRef.current = true;
    setBusy(true);
    try {
      const result = await salesChatService.send({ message: batchedMessages.join('\n'), vehicleId: vehicle?.id, vehicleTitle, customerName: name, customerPhone: phone });
      const replies = splitAssistantReply(result.reply);
      setMessages(current => [...current, ...replies.map(content => ({ role: 'assistant' as const, content }))]);
      setWhatsapp(result.whatsapp || '');
    } catch (error) {
      setMessages(current => [...current, { role: 'assistant', content: error instanceof Error ? error.message : 'Não consegui responder agora. Você pode falar com nossa equipe pelo WhatsApp.' }]);
    } finally {
      requestInFlightRef.current = false;
      setBusy(false);
      window.setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 20);
      if (pendingRef.current.length) {
        batchTimerRef.current = window.setTimeout(() => void processPending(), 250);
      }
    }
  };

  const send = (message: string) => {
    const clean = message.trim();
    if (!clean) return;
    setMessages(current => [...current, { role: 'user', content: clean }]);
    setText('');
    pendingRef.current.push(clean);
    if (batchTimerRef.current !== null) window.clearTimeout(batchTimerRef.current);
    batchTimerRef.current = window.setTimeout(() => void processPending(), requestInFlightRef.current ? 250 : 550);
  };

  const submit = (event: FormEvent) => { event.preventDefault(); void send(text); };
  const phoneDigits = phone.replace(/\D/g, '');
  const identificationValid = name.trim().length >= 2 && phoneDigits.length >= 10 && phoneDigits.length <= 13;

  const startService = (event: FormEvent) => {
    event.preventDefault();
    if (!identificationValid) return;
    const firstName = name.trim().split(/\s+/)[0];
    setMessages([{
      role: 'assistant',
      content: `Prazer, ${firstName}! Posso comparar os carros disponíveis e ajudar você a escolher pelo uso, orçamento e preferências. Que tipo de carro você procura?`,
    }]);
    setStarted(true);
  };

  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-3 z-[90] sm:bottom-6 sm:right-6">
      {open && (
        <section aria-label="Atendimento Dourado" className="fixed inset-x-2 bottom-2 top-2 flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:absolute sm:inset-auto sm:bottom-16 sm:right-0 sm:h-[min(680px,calc(100dvh-110px))] sm:w-[390px]">
          <header className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white">
            <div className="flex items-center gap-3"><span className="relative rounded-xl bg-red-600 p-2"><Bot className="h-5 w-5" /><i className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-emerald-400" /></span><div><h2 className="text-sm font-extrabold">Assistente Dourado</h2><p className="text-[11px] text-slate-400">IA + equipe de vendas</p></div></div>
            <button onClick={() => setOpen(false)} aria-label="Fechar atendimento" className="rounded-full p-2 hover:bg-white/10"><X className="h-5 w-5" /></button>
          </header>

          {!started ? (
            <form onSubmit={startService} className="flex flex-1 flex-col justify-center bg-slate-50 px-5 py-6 sm:px-7">
              <div className="mx-auto w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600"><MessageCircle className="h-6 w-6" /></span>
                <h3 className="text-xl font-extrabold text-slate-950">Antes de começar</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">Informe seus dados para personalizarmos o atendimento.</p>

                <label htmlFor="sales-chat-name" className="mt-5 block text-sm font-bold text-slate-800">Seu nome</label>
                <input id="sales-chat-name" autoComplete="name" value={name} onChange={event => setName(event.target.value)} placeholder="Como podemos chamar você?" maxLength={120} required className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100" />

                <label htmlFor="sales-chat-phone" className="mt-4 block text-sm font-bold text-slate-800">Seu WhatsApp</label>
                <input id="sales-chat-phone" autoComplete="tel" inputMode="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="(71) 99999-9999" maxLength={20} required aria-describedby="sales-chat-privacy" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100" />

                <p id="sales-chat-privacy" className="mt-3 text-xs leading-relaxed text-slate-500">Usaremos esses dados somente para continuar seu atendimento.</p>
                <button type="submit" disabled={!identificationValid} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-extrabold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300">Começar atendimento</button>
              </div>
            </form>
          ) : (
            <>
              {vehicleTitle && <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs font-semibold text-red-800">Conversando sobre: {vehicleTitle}</div>}
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-slate-50 p-4">
                {messages.map((message, index) => <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[86%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${message.role === 'user' ? 'rounded-br-sm bg-red-600 text-white' : 'rounded-bl-sm border border-slate-200 bg-white text-slate-700 shadow-sm'}`}>{message.content}</div></div>)}
                {busy && <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Preparando a resposta — você pode continuar escrevendo.</div>}
              </div>

              <div className="flex gap-2 overflow-x-auto border-t border-slate-200 bg-white px-3 py-2 text-xs">
                {['Quero financiar', 'Tenho carro na troca', 'Quero agendar uma visita'].map(option => <button key={option} onClick={() => void send(option)} className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 font-semibold text-slate-700">{option}</button>)}
              </div>
              <form onSubmit={submit} className="border-t border-slate-200 bg-white p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
                <div className="flex gap-2"><input value={text} onChange={e => setText(e.target.value)} maxLength={1200} placeholder="Digite sua dúvida..." className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-base outline-none focus:border-red-500" /><button disabled={!text.trim()} aria-label="Enviar mensagem" className="rounded-xl bg-red-600 p-3 text-white disabled:opacity-40"><Send className="h-5 w-5" /></button></div>
                <a href={whatsappUrl} target="_blank" rel="noreferrer" aria-disabled={!whatsapp} className={`mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold text-white transition ${whatsapp ? 'bg-emerald-600 hover:bg-emerald-700' : 'pointer-events-none bg-slate-300'}`}><MessageCircle className="h-5 w-5" />Falar agora pelo WhatsApp</a>
              </form>
            </>
          )}
        </section>
      )}
      <button onClick={() => setOpen(value => !value)} aria-label={open ? 'Minimizar atendimento' : 'Falar com atendente'} className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-[0_10px_35px_rgba(220,38,38,.4)] transition-transform active:scale-95 sm:h-16 sm:w-16">
        {open ? <ChevronDown className="h-6 w-6" /> : <MessageCircle className="h-7 w-7" />}
      </button>
    </div>
  );
}
