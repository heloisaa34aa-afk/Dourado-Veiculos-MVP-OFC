/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Phone, BadgeCheck, Clock, ArrowUp, ShieldAlert, CarFront, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface FooterProps {
  onAdminClick?: () => void;
}

export default function Footer({ onAdminClick }: FooterProps) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="mt-auto w-full overflow-hidden bg-[#080a0f] text-slate-400">
      <div className="border-b border-white/[.07] bg-white/[.025] py-7">
        <div className="mx-auto grid max-w-[1380px] grid-cols-1 gap-5 px-5 text-left sm:grid-cols-3 sm:px-8 lg:px-12">
          <div className="flex items-center gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-600/15"><BadgeCheck className="h-5 w-5 text-red-500" /></span>
            <div>
              <h4 className="text-white font-bold text-sm">Informações do veículo</h4>
              <p className="text-xs text-slate-400">Consulte os dados disponíveis em cada anúncio.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-600/15"><Clock className="h-5 w-5 text-red-500" /></span>
            <div>
              <h4 className="text-white font-bold text-sm">Atendimento Ágil</h4>
              <p className="text-xs text-slate-400">Continue a conversa pelos canais oficiais da loja.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-600/15"><Phone className="h-5 w-5 text-red-500" /></span>
            <div>
              <h4 className="text-white font-bold text-sm">Financiamento Facilitado</h4>
              <p className="text-xs text-slate-400">Solicite uma simulação inicial com a equipe.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1380px] grid-cols-1 gap-10 px-5 py-14 sm:px-8 md:grid-cols-12 lg:px-12 lg:py-20">
        <div className="space-y-6 md:col-span-6">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white shadow-[0_10px_30px_rgba(237,16,27,.25)]"><CarFront className="h-5 w-5" /></span>
            <span><strong className="block text-2xl font-black tracking-[-.05em] text-white">Dourado<span className="text-red-500">.</span></strong><small className="text-[9px] font-black uppercase tracking-[.26em] text-slate-600">Veículos</small></span>
          </div>
          <p className="max-w-md text-sm leading-7 text-slate-400">
            Consulte o estoque disponível, compare as informações publicadas e fale com a equipe para continuar seu atendimento.
          </p>
          <a href="/estoque" className="pressable inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-black text-slate-950">Conhecer o estoque <ArrowRight className="h-4 w-4" /></a>
        </div>

        <div className="space-y-4 md:col-span-3">
          <h4 className="text-white font-bold text-sm tracking-wider uppercase">Menu</h4>
          <ul className="space-y-2.5 text-sm">
            <li>
              <a href="/estoque" className="hover:text-white transition-colors">Estoque Completo</a>
            </li>
            <li>
              <a href="/#finance-section" className="hover:text-white transition-colors">Financiamento</a>
            </li>
            <li>
              <a href="/#advantages-section" className="hover:text-white transition-colors">Como funciona</a>
            </li>
            {onAdminClick && (
              <li className="pt-2 border-t border-slate-900 mt-2">
                <button
                  onClick={onAdminClick}
                  className="hover:text-red-500 text-slate-500 font-bold text-xs transition-colors cursor-pointer text-left w-full flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                  <span>Acesso Restrito (ADM)</span>
                </button>
              </li>
            )}
          </ul>
        </div>

        <div className="space-y-4 md:col-span-3">
          <h4 className="text-white font-bold text-sm tracking-wider uppercase">Atendimento</h4>
          <div className="flex items-start gap-3 text-sm">
            <Phone className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <p>Os dados de contato devem ser confirmados nos canais oficiais configurados pela loja.</p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[.07] bg-black/20 py-6">
        <div className="mx-auto flex max-w-[1380px] flex-col items-center justify-between gap-4 px-5 sm:flex-row sm:px-8 lg:px-12">
          <p className="text-xs text-slate-500">
            &copy; 2026 Dourado Veículos. Todos os direitos reservados.
          </p>
          <motion.button
            whileHover={{ scale: 1.1, y: -2 }}
            onClick={scrollToTop}
            className="pressable grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
            title="Voltar ao topo"
          >
            <ArrowUp className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </footer>
  );
}
