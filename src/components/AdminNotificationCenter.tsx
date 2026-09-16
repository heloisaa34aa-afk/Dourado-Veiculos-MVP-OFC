import { Bell, BellRing, Bot, CarFront, CheckCheck, MessageSquareText, WalletCards, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { adminNotificationService, type AdminNotificationItem, type AdminNotificationTarget } from '../services/adminNotification.service';

const ENABLED_KEY = 'dourado-admin-browser-notifications';
const SEEN_KEY = 'dourado-admin-seen-notifications';

function seenIds() {
  try { return new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); }
  catch { return new Set<string>(); }
}

function saveSeen(ids: Set<string>) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...ids].slice(-150)));
}

function timeLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function AdminNotificationCenter({ onOpen }: { onOpen: (target: AdminNotificationTarget) => void }) {
  const [items, setItems] = useState<AdminNotificationItem[]>([]);
  const [seen, setSeen] = useState<Set<string>>(() => seenIds());
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(() => localStorage.getItem(ENABLED_KEY) === 'true' && typeof Notification !== 'undefined' && Notification.permission === 'granted');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void adminNotificationService.listRecent().then(result => { if (active) setItems(result); }).catch(() => { if (active) setError('Execute a migration de notificações no Supabase.'); });
    const unsubscribe = adminNotificationService.subscribe(item => {
      if (!active) return;
      setItems(current => [item, ...current.filter(existing => existing.id !== item.id)].slice(0, 30));
      if (localStorage.getItem(ENABLED_KEY) === 'true' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const notification = new Notification(item.title, { body: item.message, icon: '/app-icon-192.svg', tag: `${item.eventType}:${item.id}` });
        notification.onclick = () => { window.focus(); onOpen(item.targetSection); notification.close(); };
      }
    });
    return () => { active = false; unsubscribe(); };
  }, [onOpen]);

  const unread = useMemo(() => items.filter(item => !seen.has(item.id)).length, [items, seen]);

  const enableNotifications = async () => {
    setError('');
    if (typeof Notification === 'undefined') { setError('Este navegador não oferece notificações.'); return; }
    const permission = await Notification.requestPermission();
    const allowed = permission === 'granted';
    setEnabled(allowed);
    localStorage.setItem(ENABLED_KEY, String(allowed));
    if (!allowed) setError('A permissão foi bloqueada. Libere as notificações nas configurações do navegador.');
  };

  const disableNotifications = () => {
    setEnabled(false);
    localStorage.setItem(ENABLED_KEY, 'false');
  };

  const markAllSeen = () => {
    const next = new Set(seen);
    items.forEach(item => next.add(item.id));
    setSeen(next);
    saveSeen(next);
  };

  const openItem = (item: AdminNotificationItem) => {
    const next = new Set(seen).add(item.id);
    setSeen(next);
    saveSeen(next);
    setOpen(false);
    onOpen(item.targetSection);
  };

  return <div className="relative">
    <button onClick={() => setOpen(value => !value)} className="relative grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-red-200 hover:text-red-600" aria-label={`Notificações administrativas${unread ? `, ${unread} não lidas` : ''}`}>
      {enabled ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
      {unread > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">{unread > 9 ? '9+' : unread}</span>}
    </button>

    {open && <div className="fixed inset-x-3 top-[84px] z-[200] max-h-[78dvh] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-14 sm:w-[390px]">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
        <div><p className="text-xs font-black uppercase tracking-wider text-red-600">Central comercial</p><h3 className="mt-1 text-lg font-black text-slate-950">Notificações</h3></div>
        <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100" aria-label="Fechar notificações"><X className="h-4 w-4" /></button>
      </div>

      <div className="border-b border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3"><div><strong className="text-sm text-slate-900">Alertas do navegador</strong><p className="mt-0.5 text-xs text-slate-500">Avise sobre novos clientes enquanto o painel estiver aberto.</p></div><button onClick={() => void (enabled ? disableNotifications() : enableNotifications())} className={`shrink-0 rounded-full px-3 py-2 text-xs font-black ${enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-red-600 text-white'}`}>{enabled ? 'Ativadas' : 'Ativar'}</button></div>
        {error && <p className="mt-2 text-xs font-semibold text-amber-700">{error}</p>}
      </div>

      <div className="flex items-center justify-between px-4 py-3"><span className="text-xs font-bold text-slate-500">{unread} não lida{unread === 1 ? '' : 's'}</span>{unread > 0 && <button onClick={markAllSeen} className="flex items-center gap-1 text-xs font-bold text-red-600"><CheckCheck className="h-4 w-4" /> Marcar como lidas</button>}</div>
      <div className="max-h-[48dvh] divide-y divide-slate-100 overflow-y-auto">
        {items.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">As novas simulações, mensagens e conversas da IA aparecerão aqui.</div> : items.map(item => {
          const Icon = item.eventType === 'quote' ? WalletCards : item.eventType === 'ai_chat' ? Bot : MessageSquareText;
          return <button key={item.id} onClick={() => openItem(item)} className={`flex w-full gap-3 p-4 text-left transition hover:bg-slate-50 ${seen.has(item.id) ? '' : 'bg-red-50/45'}`}>
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.eventType === 'ai_chat' ? 'bg-violet-100 text-violet-700' : item.eventType === 'quote' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}><Icon className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><strong className="text-sm text-slate-950">{item.title}</strong><small className="shrink-0 text-[10px] text-slate-400">{timeLabel(item.createdAt)}</small></span><span className="mt-1 block text-xs leading-5 text-slate-600">{item.message}</span>{item.vehicleTitle && <span className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-red-600"><CarFront className="h-3 w-3" />{item.vehicleTitle}</span>}</span>
          </button>;
        })}
      </div>
    </div>}
  </div>;
}
