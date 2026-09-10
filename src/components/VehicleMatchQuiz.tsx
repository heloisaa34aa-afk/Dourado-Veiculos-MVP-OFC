import { FormEvent, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BadgeCheck, CarFront, Check, Sparkles, X } from 'lucide-react';
import type { Car, LeadMessage } from '../types';

interface VehicleMatchQuizProps {
  cars: Car[];
  onSelectCar: (car: Car) => void;
  onSubmitLead: (lead: Omit<LeadMessage, 'id' | 'createdAt' | 'status'>) => Promise<void> | void;
}

const uses = ['Cidade', 'Trabalho', 'Família', 'Viagens'] as const;
const categories = ['Sem preferência', 'Hatch', 'Sedan', 'SUV', 'Picape', 'Utilitário'] as const;
const gearboxes = ['Tanto faz', 'Automático', 'Manual'] as const;
const payments = ['Financiamento', 'À vista', 'Consórcio'] as const;

function recommendedCategories(use: string) {
  if (use === 'Família' || use === 'Viagens') return ['SUV', 'Sedan'];
  if (use === 'Trabalho') return ['Picape', 'Utilitário', 'Hatch'];
  return ['Hatch', 'Popular', 'Sedan'];
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function VehicleMatchQuiz({ cars, onSelectCar, onSubmitLead }: VehicleMatchQuizProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [use, setUse] = useState('');
  const [category, setCategory] = useState('Sem preferência');
  const [gearbox, setGearbox] = useState('Tanto faz');
  const [budget, setBudget] = useState('100000');
  const [payment, setPayment] = useState('Financiamento');
  const [hasTradeIn, setHasTradeIn] = useState(false);
  const [tradeModel, setTradeModel] = useState('');
  const [tradeYear, setTradeYear] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [sent, setSent] = useState(false);

  const results = useMemo(() => {
    const ceiling = Number(budget);
    const idealCategories = recommendedCategories(use);
    return cars.filter(car => !car.isSold).map(car => {
      let score = 0;
      if (idealCategories.includes(car.category)) score += 5;
      if (category !== 'Sem preferência' && car.category === category) score += 7;
      if (gearbox !== 'Tanto faz' && normalize(car.gearbox).includes(normalize(gearbox))) score += 5;
      if (car.price <= ceiling) score += 6;
      else score -= Math.min(6, Math.ceil((car.price - ceiling) / Math.max(ceiling * .1, 1)));
      if (payment === 'Financiamento' && car.price <= ceiling * 1.12) score += 1;
      return { car, score };
    }).sort((a, b) => b.score - a.score || a.car.price - b.car.price).slice(0, 3);
  }, [budget, cars, category, gearbox, payment, use]);

  const close = () => { setOpen(false); setStep(0); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const selected = results.find(result => result.car.id === selectedId)?.car || results[0]?.car;
    if (!selected || name.trim().length < 2 || phone.replace(/\D/g, '').length < 10) return;
    const trade = hasTradeIn ? ` Tenho carro na troca: ${tradeModel || 'modelo a informar'} ${tradeYear ? `(${tradeYear})` : ''}.` : ' Não tenho carro na troca.';
    await onSubmitLead({
      carId: selected.id,
      carTitle: `${selected.brand} ${selected.model}`,
      name: name.trim(),
      phone: phone.trim(),
      email: '',
      message: `Quiz de recomendação: uso ${use}, preferência ${category}, câmbio ${gearbox}, orçamento até R$ ${Number(budget).toLocaleString('pt-BR')}, pagamento ${payment}.${trade} Recomendação escolhida: ${selected.brand} ${selected.model} ${selected.year}.`,
    });
    setSent(true);
  };

  return (
    <>
      <section id="vehicle-match" className="mx-auto max-w-[1380px] scroll-mt-24 px-4 pb-6 pt-14 sm:px-8 lg:pt-20">
        <div className="relative overflow-hidden rounded-[34px] bg-slate-950 px-6 py-9 text-white shadow-xl sm:px-10 lg:flex lg:items-center lg:justify-between lg:px-14 lg:py-12">
          <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-red-600/30 blur-3xl" />
          <div className="relative max-w-2xl">
            <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-red-400"><Sparkles className="h-4 w-4" /> Seu carro ideal</p>
            <h2 className="text-3xl font-black tracking-[-.04em] sm:text-4xl">Encontre o modelo que combina com você.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Responda algumas perguntas e veja as melhores opções do estoque para seu uso, orçamento e forma de pagamento.</p>
          </div>
          <button onClick={() => setOpen(true)} className="relative mt-7 inline-flex min-h-13 items-center gap-2 rounded-full bg-red-600 px-6 text-sm font-extrabold hover:bg-red-500 lg:mt-0">Descobrir meu carro <ArrowRight className="h-4 w-4" /></button>
        </div>
      </section>

      {open && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="Descubra seu carro ideal">
          <div className="relative flex max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[30px] bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-[30px]">
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-7">
              <div><p className="text-xs font-black uppercase tracking-wider text-red-600">Etapa {Math.min(step + 1, 4)} de 4</p><h3 className="text-xl font-black text-slate-950">Seu carro ideal</h3></div>
              <button onClick={close} className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-700" aria-label="Fechar quiz"><X className="h-5 w-5" /></button>
            </header>

            <div className="h-1.5 bg-slate-100"><div className="h-full bg-red-600 transition-all" style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>
            <div className="overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
              {step === 0 && <QuizChoice title="Como você pretende usar o carro?" options={uses} value={use} onChange={setUse} />}

              {step === 1 && <div className="space-y-7">
                <QuizChoice title="Qual estilo você prefere?" options={categories} value={category} onChange={setCategory} compact />
                <QuizChoice title="Preferência de câmbio" options={gearboxes} value={gearbox} onChange={setGearbox} compact />
                <label className="block"><span className="mb-3 block text-lg font-black text-slate-950">Quanto pretende investir?</span><select value={budget} onChange={event => setBudget(event.target.value)} className="min-h-13 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base font-bold outline-none focus:border-red-500"><option value="60000">Até R$ 60 mil</option><option value="80000">Até R$ 80 mil</option><option value="100000">Até R$ 100 mil</option><option value="150000">Até R$ 150 mil</option><option value="250000">Até R$ 250 mil</option></select></label>
              </div>}

              {step === 2 && <div className="space-y-7">
                <QuizChoice title="Como pretende pagar?" options={payments} value={payment} onChange={setPayment} compact />
                <div><h4 className="text-lg font-black text-slate-950">Vai usar seu carro como parte do pagamento?</h4><div className="mt-3 grid grid-cols-2 gap-3"><button onClick={() => setHasTradeIn(true)} className={`min-h-13 rounded-2xl border-2 font-bold ${hasTradeIn ? 'border-red-600 bg-red-50 text-red-700' : 'border-slate-200'}`}>Sim, tenho troca</button><button onClick={() => setHasTradeIn(false)} className={`min-h-13 rounded-2xl border-2 font-bold ${!hasTradeIn ? 'border-red-600 bg-red-50 text-red-700' : 'border-slate-200'}`}>Não</button></div></div>
                {hasTradeIn && <div className="grid gap-3 sm:grid-cols-2"><input value={tradeModel} onChange={event => setTradeModel(event.target.value)} placeholder="Modelo do seu carro" className="min-h-13 rounded-2xl border border-slate-300 px-4 outline-none focus:border-red-500" /><input value={tradeYear} onChange={event => setTradeYear(event.target.value)} inputMode="numeric" placeholder="Ano" maxLength={4} className="min-h-13 rounded-2xl border border-slate-300 px-4 outline-none focus:border-red-500" /></div>}
              </div>}

              {step === 3 && <div>
                <h4 className="text-2xl font-black tracking-tight text-slate-950">Melhores combinações para você</h4>
                <p className="mt-2 text-sm text-slate-500">Escolha uma opção para conhecer ou solicitar uma simulação.</p>
                <div className="mt-5 grid gap-3">
                  {results.map(({ car }, index) => <article key={car.id} className={`grid grid-cols-[92px_1fr] gap-4 rounded-2xl border-2 p-3 ${selectedId === car.id || (!selectedId && index === 0) ? 'border-red-500 bg-red-50/50' : 'border-slate-200'}`}>
                    <img src={car.images[0]} alt={`${car.brand} ${car.model}`} className="h-24 w-full rounded-xl object-cover" />
                    <div className="min-w-0"><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-black uppercase text-red-600">{index === 0 ? 'Melhor combinação' : 'Também combina'}</p><h5 className="truncate font-black text-slate-950">{car.brand} {car.model}</h5></div><button onClick={() => setSelectedId(car.id)} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${selectedId === car.id || (!selectedId && index === 0) ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400'}`} aria-label={`Selecionar ${car.brand} ${car.model}`}><Check className="h-4 w-4" /></button></div><p className="mt-1 text-xs text-slate-500">{car.year} · {car.gearbox} · {car.category}</p><div className="mt-2 flex items-center justify-between"><strong className="text-sm text-slate-900">R$ {car.price.toLocaleString('pt-BR')}</strong><button onClick={() => onSelectCar(car)} className="text-xs font-extrabold text-red-600">Ver veículo</button></div></div>
                  </article>)}
                </div>
                {!sent ? <form onSubmit={submit} className="mt-6 grid gap-3 rounded-2xl bg-slate-950 p-4 sm:grid-cols-2"><p className="text-sm font-bold text-white sm:col-span-2">Receba uma simulação dessa escolha</p><input required value={name} onChange={event => setName(event.target.value)} placeholder="Seu nome" className="min-h-12 rounded-xl bg-white px-3.5" /><input required value={phone} onChange={event => setPhone(event.target.value)} inputMode="tel" placeholder="Seu WhatsApp" className="min-h-12 rounded-xl bg-white px-3.5" /><button className="min-h-12 rounded-xl bg-red-600 px-5 text-sm font-extrabold text-white sm:col-span-2">Quero receber a simulação</button></form> : <div className="mt-6 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800"><BadgeCheck className="h-5 w-5" /> Recebemos suas preferências. Nossa equipe continuará com você.</div>}
              </div>}
            </div>

            {step < 3 && <footer className="flex items-center justify-between border-t border-slate-200 px-5 py-4 sm:px-7"><button onClick={() => setStep(value => Math.max(0, value - 1))} disabled={step === 0} className="inline-flex min-h-11 items-center gap-2 px-3 text-sm font-bold text-slate-600 disabled:invisible"><ArrowLeft className="h-4 w-4" /> Voltar</button><button onClick={() => setStep(value => Math.min(3, value + 1))} disabled={step === 0 && !use} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-red-600 px-6 text-sm font-extrabold text-white disabled:bg-slate-300">Continuar <ArrowRight className="h-4 w-4" /></button></footer>}
          </div>
        </div>
      )}
    </>
  );
}

function QuizChoice({ title, options, value, onChange, compact = false }: { title: string; options: readonly string[]; value: string; onChange: (value: string) => void; compact?: boolean }) {
  return <div><h4 className="text-lg font-black text-slate-950">{title}</h4><div className={`mt-3 grid gap-3 ${compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>{options.map(option => <button key={option} onClick={() => onChange(option)} className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 px-3 text-sm font-bold transition ${value === option ? 'border-red-600 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'}`}><CarFront className="h-4 w-4" />{option}</button>)}</div></div>;
}
