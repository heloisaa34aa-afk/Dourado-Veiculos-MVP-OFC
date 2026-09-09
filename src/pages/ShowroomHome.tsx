import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BadgeCheck, Banknote, CarFront, ChevronRight,
  Headphones, Search, ShieldCheck, SlidersHorizontal, Sparkles, X,
} from 'lucide-react';
import type { Car, LeadMessage } from '../types';
import type { SiteBanner } from '../services/banner.service';
import CarCard from '../components/CarCard';
import { PublicPromotion } from '../components/PublicPromotion';

interface ShowroomHomeProps {
  cars: Car[];
  carsError: string | null;
  banners: SiteBanner[];
  onSelectCar: (car: Car) => void;
  onSubmitLead: (lead: Omit<LeadMessage, 'id' | 'createdAt' | 'status'>) => Promise<void> | void;
}

export default function ShowroomHome({ cars, carsError, banners, onSelectCar, onSubmitLead }: ShowroomHomeProps) {
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('Todos');
  const [category, setCategory] = useState('Todos');
  const [financeCar, setFinanceCar] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const available = useMemo(() => cars.filter(car => !car.isSold), [cars]);
  const featuredCars = useMemo(() => {
    const selected = available.filter(car => car.isFeatured);
    return (selected.length ? selected : available).slice(0, 6);
  }, [available]);
  const featured = featuredCars[featuredIndex % Math.max(featuredCars.length, 1)];
  const brands = useMemo(() => ['Todos', ...Array.from(new Set(available.map(car => car.brand))).sort()], [available]);
  const categories = useMemo(() => ['Todos', ...Array.from(new Set(available.map(car => car.category))).sort()], [available]);
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    return available.filter(car => {
      const searchable = `${car.brand} ${car.model} ${car.version} ${car.year} ${car.fuel} ${car.gearbox}`.toLocaleLowerCase('pt-BR');
      return (!query || searchable.includes(query))
        && (brand === 'Todos' || car.brand === brand)
        && (category === 'Todos' || car.category === category);
    });
  }, [available, brand, category, search]);

  useEffect(() => {
    if (featuredCars.length < 2) return;
    const timer = window.setInterval(() => setFeaturedIndex(index => (index + 1) % featuredCars.length), 6500);
    return () => window.clearInterval(timer);
  }, [featuredCars.length]);

  useEffect(() => { setFeaturedIndex(index => Math.min(index, Math.max(featuredCars.length - 1, 0))); }, [featuredCars.length]);

  const submitFinance = async (event: FormEvent) => {
    event.preventDefault();
    const selected = cars.find(car => car.id === financeCar);
    if (!selected || !name.trim() || !phone.trim()) return;
    await onSubmitLead({
      carId: selected.id,
      carTitle: `${selected.brand} ${selected.model}`,
      name: name.trim(),
      phone: phone.trim(),
      email: '',
      message: `Tenho interesse em financiar o ${selected.brand} ${selected.model} ${selected.year}.`,
    });
    setSent(true);
    setName('');
    setPhone('');
  };

  const clearFilters = () => { setSearch(''); setBrand('Todos'); setCategory('Todos'); };

  return (
    <main className="overflow-hidden bg-[#f3f4f6] text-slate-950">
      <section className="relative isolate min-h-[660px] overflow-hidden bg-[#07090d] text-white lg:min-h-[720px]">
        {featured?.images[0] && (
          <img
            key={featured.id}
            src={featured.images[0]}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-center opacity-55 transition-opacity duration-700"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,6,10,.98)_0%,rgba(4,6,10,.86)_43%,rgba(4,6,10,.2)_78%),linear-gradient(0deg,rgba(4,6,10,.9)_0%,transparent_55%)]" />
        <div className="absolute -right-24 top-16 h-72 w-72 rounded-full bg-red-600/25 blur-[110px]" />

        <div className="relative mx-auto flex min-h-[660px] max-w-[1440px] flex-col justify-end px-5 pb-32 pt-24 sm:px-8 lg:min-h-[720px] lg:justify-center lg:px-12 lg:pb-28">
          <div className="max-w-3xl">
            <div className="mb-5 flex items-center gap-3 text-xs font-extrabold uppercase tracking-[.22em] text-red-400">
              <span className="h-px w-10 bg-red-500" /> Curadoria Dourado
            </div>
            <h1 className="max-w-2xl text-[clamp(2.9rem,7vw,6.8rem)] font-black leading-[.88] tracking-[-.065em]">
              Seu próximo carro, <span className="text-red-500">sem dúvidas.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Explore cada detalhe, gire o veículo em 360° e fale com quem entende antes de decidir.
            </p>
            {featured && <div className="mt-7 flex items-center gap-3"><span className="rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-red-400">Em destaque</span><span className="text-sm font-bold text-white">{featured.brand} {featured.model} · {featured.year}</span></div>}
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#estoque" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-red-600 px-6 text-sm font-extrabold text-white transition hover:bg-red-500">
                Explorar estoque <ArrowRight className="h-4 w-4" />
              </a>
              {featured && (
                <button onClick={() => onSelectCar(featured)} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15">
                  Ver destaque <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-12 grid max-w-xl grid-cols-3 gap-3 border-t border-white/15 pt-6 text-sm">
            <div><strong className="block text-xl font-black">360°</strong><span className="text-xs text-slate-400">visão completa</span></div>
            <div><strong className="block text-xl font-black">100+</strong><span className="text-xs text-slate-400">itens avaliados</span></div>
            <div><strong className="block text-xl font-black">1:1</strong><span className="text-xs text-slate-400">atendimento</span></div>
          </div>

          {featuredCars.length > 1 && <div className="mt-8 flex items-center gap-3" aria-label="Veículos em destaque"><button onClick={() => setFeaturedIndex(index => (index - 1 + featuredCars.length) % featuredCars.length)} className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/25 text-white backdrop-blur hover:bg-white/10" aria-label="Destaque anterior"><ArrowLeft className="h-4 w-4" /></button><div className="flex gap-2">{featuredCars.map((car, index) => <button key={car.id} onClick={() => setFeaturedIndex(index)} aria-label={`Ver ${car.brand} ${car.model}`} className={`h-2 rounded-full transition-all ${index === featuredIndex ? 'w-10 bg-red-500' : 'w-2 bg-white/35 hover:bg-white/70'}`} />)}</div><button onClick={() => setFeaturedIndex(index => (index + 1) % featuredCars.length)} className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/25 text-white backdrop-blur hover:bg-white/10" aria-label="Próximo destaque"><ArrowRight className="h-4 w-4" /></button></div>}
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-20 max-w-[1380px] px-4 sm:px-8">
        <div className="rounded-[28px] border border-black/5 bg-white p-4 shadow-[0_30px_80px_rgba(15,23,42,.16)] sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[1.7fr_.7fr_.7fr_auto]">
            <label className="flex min-h-14 items-center gap-3 rounded-2xl bg-slate-100 px-4 focus-within:ring-2 focus-within:ring-red-500">
              <Search className="h-5 w-5 text-slate-400" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Busque por modelo, versão ou combustível" className="min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:text-slate-400" />
            </label>
            <select aria-label="Filtrar por marca" value={brand} onChange={event => setBrand(event.target.value)} className="min-h-14 rounded-2xl border-0 bg-slate-100 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500">
              {brands.map(item => <option key={item}>{item}</option>)}
            </select>
            <select aria-label="Filtrar por categoria" value={category} onChange={event => setCategory(event.target.value)} className="min-h-14 rounded-2xl border-0 bg-slate-100 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500">
              {categories.map(item => <option key={item}>{item}</option>)}
            </select>
            {(search || brand !== 'Todos' || category !== 'Todos') && <button onClick={clearFilters} aria-label="Limpar filtros" className="flex min-h-14 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold text-slate-600 hover:bg-slate-100"><X className="h-4 w-4" /> Limpar</button>}
          </div>
        </div>
      </section>

      <section id="estoque" className="mx-auto max-w-[1380px] scroll-mt-28 px-4 py-20 sm:px-8 lg:py-28">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-red-600"><Sparkles className="h-4 w-4" /> Seleção atual</p>
            <h2 className="text-4xl font-black tracking-[-.045em] sm:text-5xl">Carros que merecem sua atenção.</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-500">{filtered.length} veículo{filtered.length === 1 ? '' : 's'} disponível{filtered.length === 1 ? '' : 'is'} para conhecer agora.</p>
        </div>

        <div className="mb-8 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categories.map(item => (
            <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-bold transition ${category === item ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-400'}`}>
              {item === 'Todos' ? 'Todos os modelos' : item}
            </button>
          ))}
        </div>

        {carsError && <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Não foi possível carregar o estoque agora. Tente novamente em instantes.</div>}
        {filtered.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map(car => <CarCard key={car.id} car={car} onSelect={onSelectCar} />)}
          </div>
        ) : (
          <div className="rounded-[32px] border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
            <SlidersHorizontal className="mx-auto mb-4 h-9 w-9 text-slate-300" />
            <h3 className="text-xl font-black">Nenhum veículo com esses filtros.</h3>
            <button onClick={clearFilters} className="mt-4 text-sm font-bold text-red-600">Ver estoque completo</button>
          </div>
        )}
      </section>

      <div className="mx-auto max-w-[1380px] px-4 sm:px-8"><PublicPromotion banners={banners} placement="home_inline" /></div>

      <section id="advantages-section" className="mx-auto grid max-w-[1380px] gap-5 px-4 py-20 sm:px-8 lg:grid-cols-2 lg:py-28">
        <div className="flex min-h-[470px] flex-col justify-between rounded-[36px] bg-red-600 p-7 text-white sm:p-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15"><CarFront className="h-7 w-7" /></div>
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[.2em] text-red-100">Compra transparente</p>
            <h2 className="max-w-lg text-4xl font-black leading-[.98] tracking-[-.045em] sm:text-5xl">Você vê o carro antes mesmo de chegar à loja.</h2>
            <p className="mt-5 max-w-xl leading-7 text-red-50">Exterior, interior, pontos de interesse e avarias documentadas em uma experiência 360° pensada para celular.</p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {[
            [ShieldCheck, 'Procedência', 'Laudo e histórico apresentados com clareza.'],
            [BadgeCheck, 'Inspeção', 'Mais de 100 pontos avaliados antes da oferta.'],
            [Banknote, 'Financiamento', 'Condições encontradas para o seu momento.'],
            [Headphones, 'Atendimento', 'IA para dúvidas rápidas e vendedor quando precisar.'],
          ].map(([Icon, title, copy]) => {
            const ItemIcon = Icon as typeof ShieldCheck;
            return <article key={String(title)} className="flex min-h-[220px] flex-col justify-between rounded-[30px] border border-slate-200 bg-white p-7"><ItemIcon className="h-7 w-7 text-red-600" /><div><h3 className="text-xl font-black">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{String(copy)}</p></div></article>;
          })}
        </div>
      </section>

      <section id="finance-section" className="bg-[#090b10] px-4 py-20 text-white sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-[1260px] gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[.2em] text-red-500">Próximo passo</p>
            <h2 className="text-4xl font-black tracking-[-.045em] sm:text-5xl">Descubra uma condição que cabe na sua vida.</h2>
            <p className="mt-5 max-w-lg leading-7 text-slate-400">Escolha o veículo e deixe um contato. Um consultor continua a conversa sem compromisso.</p>
          </div>
          <form onSubmit={submitFinance} className="grid gap-4 rounded-[32px] border border-white/10 bg-white/5 p-5 backdrop-blur sm:grid-cols-2 sm:p-8">
            <select required value={financeCar} onChange={event => setFinanceCar(event.target.value)} className="min-h-14 rounded-2xl border border-white/10 bg-slate-900 px-4 text-sm text-white outline-none focus:border-red-500 sm:col-span-2">
              <option value="">Escolha um veículo</option>
              {available.map(car => <option key={car.id} value={car.id}>{car.brand} {car.model} · {car.year}</option>)}
            </select>
            <input required value={name} onChange={event => setName(event.target.value)} placeholder="Seu nome" className="min-h-14 rounded-2xl border border-white/10 bg-slate-900 px-4 outline-none focus:border-red-500" />
            <input required value={phone} onChange={event => setPhone(event.target.value)} inputMode="tel" placeholder="Seu WhatsApp" className="min-h-14 rounded-2xl border border-white/10 bg-slate-900 px-4 outline-none focus:border-red-500" />
            <button className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 text-sm font-black text-white hover:bg-red-500 sm:col-span-2">{sent ? 'Recebemos seu pedido' : 'Quero receber uma simulação'} <ArrowRight className="h-4 w-4" /></button>
          </form>
        </div>
      </section>
    </main>
  );
}
