import { CarFront, Download, LogOut, Menu, ShieldCheck, UserRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { UserProfile } from '../types';

interface HeaderProps { userProfile: UserProfile | null; onLogout: () => void }

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Header({ userProfile, onLogout }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const isAdmin = location.pathname.startsWith('/admin');

  useEffect(() => {
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(standalone);
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const markInstalled = () => { setInstalled(true); setInstallPrompt(null); };
    window.addEventListener('beforeinstallprompt', capturePrompt);
    window.addEventListener('appinstalled', markInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt);
      window.removeEventListener('appinstalled', markInstalled);
    };
  }, []);

  const installApp = async () => {
    setMenuOpen(false);
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
      setInstallPrompt(null);
      return;
    }
    const isAppleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent);
    window.alert(isAppleMobile
      ? 'No iPhone ou iPad, toque em Compartilhar e depois em “Adicionar à Tela de Início”.'
      : 'Abra o menu do navegador e escolha “Instalar Dourado Veículos” ou “Criar atalho”.');
  };

  const goHomeSection = (id?: string) => {
    setMenuOpen(false);
    navigate('/');
    if (id) window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 80);
  };

  const goCatalog = () => {
    setMenuOpen(false);
    navigate('/estoque');
  };

  return (
    <header className="sticky top-0 z-[70] border-b border-white/10 bg-[#080a0e]/95 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 sm:px-8 lg:h-20 lg:px-12">
        <button onClick={() => goHomeSection()} className="flex items-center gap-3 text-left" aria-label="Ir para o início">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-600 shadow-[0_8px_30px_rgba(220,38,38,.3)]"><CarFront className="h-5 w-5" /></span>
          <span><strong className="block text-lg font-black leading-none tracking-[-.035em]">Dourado<span className="text-red-500">.</span></strong><small className="mt-1 block text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">Veículos</small></span>
        </button>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Navegação principal">
          <button onClick={goCatalog} className="text-sm font-bold text-slate-300 transition hover:text-white">Estoque</button>
          <button onClick={() => goHomeSection('advantages-section')} className="text-sm font-bold text-slate-300 transition hover:text-white">Por que a Dourado</button>
          <button onClick={() => goHomeSection('finance-section')} className="text-sm font-bold text-slate-300 transition hover:text-white">Financiamento</button>
        </nav>

        <div className="flex items-center gap-2">
          {userProfile?.role === 'admin' && !installed && <button onClick={() => void installApp()} className="hidden min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-sm font-bold transition hover:bg-white/10 lg:flex" aria-label="Instalar painel Dourado Admin"><Download className="h-4 w-4" /> Instalar Admin</button>}
          {userProfile?.role === 'admin' && <button onClick={() => navigate('/admin')} className={`flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-bold sm:px-4 ${isAdmin ? 'bg-red-600' : 'border border-white/15 bg-white/5'}`} aria-label="Abrir painel administrativo"><ShieldCheck className="h-4 w-4" /><span className="hidden sm:inline">Painel ADM</span></button>}
          {userProfile ? <><button onClick={() => navigate('/cliente')} className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/5" aria-label="Área do cliente"><UserRound className="h-5 w-5" /></button><button onClick={onLogout} className="hidden h-11 w-11 place-items-center rounded-full text-slate-400 hover:bg-white/5 hover:text-red-400 sm:grid" aria-label="Sair"><LogOut className="h-5 w-5" /></button></> : <button onClick={() => navigate('/cliente')} className="hidden min-h-11 rounded-full bg-white px-5 text-sm font-black text-slate-950 transition hover:bg-slate-200 sm:block">Entrar</button>}
          <button onClick={() => setMenuOpen(value => !value)} className="grid h-11 w-11 place-items-center rounded-full border border-white/15 lg:hidden" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}>{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
      </div>

      {menuOpen && <div className="border-t border-white/10 bg-[#080a0e] px-4 py-4 lg:hidden"><nav className="grid gap-1"><button onClick={goCatalog} className="rounded-xl px-4 py-3 text-left font-bold hover:bg-white/5">Estoque</button><button onClick={() => goHomeSection('advantages-section')} className="rounded-xl px-4 py-3 text-left font-bold hover:bg-white/5">Por que a Dourado</button><button onClick={() => goHomeSection('finance-section')} className="rounded-xl px-4 py-3 text-left font-bold hover:bg-white/5">Financiamento</button>{userProfile?.role === 'admin' && !installed && <button onClick={() => void installApp()} className="flex items-center gap-2 rounded-xl px-4 py-3 text-left font-bold hover:bg-white/5"><Download className="h-4 w-4" /> Instalar painel administrativo</button>}{userProfile?.role === 'admin' ? <button onClick={() => { setMenuOpen(false); navigate('/admin'); }} className="mt-2 rounded-xl bg-red-600 px-4 py-3 text-left font-black">Abrir Painel Administrativo</button> : <button onClick={() => { setMenuOpen(false); navigate('/admin'); }} className="mt-2 rounded-xl border border-white/15 px-4 py-3 text-left font-bold">Acesso administrativo</button>}{!userProfile && <button onClick={() => navigate('/cliente')} className="rounded-xl bg-red-600 px-4 py-3 text-left font-black">Entrar na área do cliente</button>}</nav></div>}
    </header>
  );
}
