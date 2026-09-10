import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, ChevronDown, Loader2, MessageCircle, Send, UserRound, X } from 'lucide-react';
import type { Car } from '../types';
import { salesChatService } from '../services/salesChat.service';
import { settingsService } from '../services/settings.service';

interface ChatMessage { role: 'user' | 'assistant'; content: string }

export function SalesAssistantChat({ vehicle }: { vehicle?: Car }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'assistant', content: 'Olá! Eu posso comparar os carros disponíveis e ajudar você a escolher pelo uso, orçamento e preferências. Que tipo de carro você procura?',
  }]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [showContact, setShowContact] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const send = async (message: string) => {
    const clean = message.trim();
    if (!clean || busy) return;
    setMessages(current => [...current, { role: 'user', content: clean }]);
    setText('');
    setBusy(true);
    try {
      const result = await salesChatService.send({ message: clean, vehicleId: vehicle?.id, vehicleTitle, customerName: name, customerPhone: phone });
      setMessages(current => [...current, { role: 'assistant', content: result.reply }]);
      setWhatsapp(result.whatsapp || '');
    } catch (error) {
      setMessages(current => [...current, { role: 'assistant', content: error instanceof Error ? error.message : 'Não consegui responder agora. Você pode falar com nossa equipe pelo WhatsApp.' }]);
    } finally {
      setBusy(false);
      window.setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 20);
    }
  };

  const submit = (event: FormEvent) => { event.preventDefault(); void send(text); };

  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-3 z-[90] sm:bottom-6 sm:right-6">
      {open && (
        <section aria-label="Atendimento Dourado" className="fixed inset-x-2 bottom-2 top-2 flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:absolute sm:inset-auto sm:bottom-16 sm:right-0 sm:h-[min(680px,calc(100dvh-110px))] sm:w-[390px]">
          <header className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white">
            <div className="flex items-center gap-3"><span className="relative rounded-xl bg-red-600 p-2"><Bot className="h-5 w-5" /><i className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-emerald-400" /></span><div><h2 className="text-sm font-extrabold">Assistente Dourado</h2><p className="text-[11px] text-slate-400">IA + equipe de vendas</p></div></div>
            <button onClick={() => setOpen(false)} aria-label="Fechar atendimento" className="rounded-full p-2 hover:bg-white/10"><X className="h-5 w-5" /></button>
          </header>

          {vehicleTitle && <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs font-semibold text-red-800">Conversando sobre: {vehicleTitle}</div>}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-slate-50 p-4">
            {messages.map((message, index) => <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${message.role === 'user' ? 'rounded-br-sm bg-red-600 text-white' : 'rounded-bl-sm border border-slate-200 bg-white text-slate-700 shadow-sm'}`}>{message.content}</div></div>)}
            {busy && <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Analisando as melhores opções...</div>}
          </div>

          <div className="flex gap-2 overflow-x-auto border-t border-slate-200 bg-white px-3 py-2 text-xs">
            {['Quero financiar', 'Tenho carro na troca', 'Quero agendar uma visita'].map(option => <button key={option} onClick={() => void send(option)} className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 font-semibold text-slate-700">{option}</button>)}
          </div>
          {showContact && <div className="grid grid-cols-2 gap-2 border-t border-slate-100 px-3 py-2"><input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="WhatsApp" inputMode="tel" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><button type="button" disabled={busy || !phone.trim()} onClick={() => void send('Quero falar com um vendedor')} className="col-span-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">Solicitar contato</button></div>}
          <form onSubmit={submit} className="border-t border-slate-200 bg-white p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
            <div className="flex gap-2"><button type="button" onClick={() => setShowContact(value => !value)} title="Identificação" className="rounded-xl bg-slate-100 p-3 text-slate-600"><UserRound className="h-5 w-5" /></button><input value={text} onChange={e => setText(e.target.value)} maxLength={1200} placeholder="Digite sua dúvida..." className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-500" /><button disabled={busy || !text.trim()} className="rounded-xl bg-red-600 p-3 text-white disabled:opacity-40"><Send className="h-5 w-5" /></button></div>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" aria-disabled={!whatsapp} className={`mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold text-white transition ${whatsapp ? 'bg-emerald-600 hover:bg-emerald-700' : 'pointer-events-none bg-slate-300'}`}><MessageCircle className="h-5 w-5" />Falar agora pelo WhatsApp</a>
          </form>
        </section>
      )}
      <button onClick={() => setOpen(value => !value)} aria-label={open ? 'Minimizar atendimento' : 'Falar com atendente'} className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-[0_10px_35px_rgba(220,38,38,.4)] transition-transform active:scale-95 sm:h-16 sm:w-16">
        {open ? <ChevronDown className="h-6 w-6" /> : <MessageCircle className="h-7 w-7" />}
      </button>
    </div>
  );
}
