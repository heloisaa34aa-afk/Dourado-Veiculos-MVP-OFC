import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BadgeCheck, Banknote, CarFront, ChevronRight,
  Headphones, Images, RotateCcw, Search, ShieldCheck, SlidersHorizontal, Sparkles, X,
} from 'lucide-react';
import type { Car, LeadMessage } from '../types';
import type { SiteBanner } from '../services/banner.service';
import CarCard from '../components/CarCard';
import { PublicPromotion } from '../components/PublicPromotion';
import { VehicleMatchQuiz } from '../components/VehicleMatchQuiz';
import { useVehicle360 } from '../hooks/useVehicle360';

interface ShowroomHomeProps {
  cars: Car[];
  carsError: string | null;
  banners: SiteBanner[];
  onSelectCar: (car: Car) => void;
  onSubmitLead: (lead: Omit<LeadMessage, 'id' | 'createdAt' | 'status'>) => Promise<void> | void;
}

function FeaturedVehicleMedia({ car, onInteractiveChange }: { car: Car; onInteractiveChange: (active: boolean) => void }) {
  const [mode, setMode] = useState<'photos' | '360'>('photos');
  const [photoIndex, setPhotoIndex] = useState(0);
  const viewer = useVehicle360(car.id, 'public', 'exterior');
  const frames = viewer.project?.frames || [];
  const has360 = viewer.project?.status === 'completed' && frames.length > 0;
  const images = car.images.length ? car.images : ['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=1200'];

  useEffect(() => {
    setMode('photos');
    setPhotoIndex(0);
    onInteractiveChange(false);
  }, [car.id, onInteractiveChange]);

  useEffect(() => {
    if (mode !== 'photos' || images.length < 2) return;
    const timer = window.setInterval(() => setPhotoIndex(index => (index + 1) % images.length), 3200);
    return () => window.clearInterval(timer);
  }, [images.length, mode]);

  const chooseMode = (next: 'photos' | '360') => {
    setMode(next);
    onInteractiveChange(next === '360');
  };

  return <div className="overflow-hidden rounded-[28px] border border-white/15 bg-black/45 shadow-[0_30px_90px_rgba(0,0,0,.45)] backdrop-blur">
    <div className="relative aspect-[4/3] overflow-hidden bg-[#080a0e] sm:aspect-video">
      {mode === '360' && has360 ? <>
        <img
          src={frames[viewer.currentFrame]?.imageUrl || frames[0].imageUrl}
          alt={`Visão 360° do ${car.brand} ${car.model}`}
          draggable={false}
          onPointerDown={viewer.handlePointerDown}
          onPointerMove={viewer.handlePointerMove}
          onPointerUp={viewer.handlePointerUp}
          onPointerCancel={viewer.handlePointerUp}
          onPointerLeave={viewer.handlePointerUp}
          className="h-full w-full touch-none cursor-ew-resize object-contain"
        />
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/65 px-3 py-2 text-xs font-bold text-white backdrop-blur">Arraste para girar · {viewer.currentFrame + 1}/{frames.length}</div>
      </> : <img key={`${car.id}-${photoIndex}`} src={images[photoIndex % images.length]} alt={`${car.brand} ${car.model}`} className="h-full w-full object-cover" fetchPriority="high" />}

      <div className="absolute right-3 top-3 flex rounded-full border border-white/15 bg-black/65 p-1 text-white backdrop-blur">
        <button onClick={() => chooseMode('photos')} className={`flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-extrabold ${mode === 'photos' ? 'bg-white text-slate-950' : ''}`}><Images className="h-4 w-4" /> Fotos</button>
        {has360 && <button onClick={() => chooseMode('360')} className={`flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-extrabold ${mode === '360' ? 'bg-red-600 text-white' : ''}`}><RotateCcw className="h-4 w-4" /> 360°</button>}
      </div>
      {mode === 'photos' && images.length > 1 && <div className="absolute bottom-3 right-3 flex gap-1.5">{images.slice(0, 8).map((_, index) => <button key={index} onClick={() => setPhotoIndex(index)} aria-label={`Ver foto ${index + 1}`} className={`h-1.5 rounded-full ${index === photoIndex % images.length ? 'w-7 bg-red-500' : 'w-1.5 bg-white/60'}`} />)}</div>}
    </div>
  </div>;
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
  const [featuredPaused, setFeaturedPaused] = useState(false);

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
    if (featuredCars.length < 2 || featuredPaused) return;
    const timer = window.setInterval(() => setFeaturedIndex(index => (index + 1) % featuredCars.length), 6500);
    return () => window.clearInterval(timer);
  }, [featuredCars.length, featuredPaused]);

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
      <section className="relative isolate overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f7f7f8_55%,#eceff3_100%)]">
        <div className="pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full bg-red-600/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-slate-900/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-[1440px] gap-10 px-5 pb-24 pt-16 sm:px-8 sm:pt-20 lg:min-h-[680px] lg:grid-cols-[.82fr_1.18fr] lg:items-center lg:gap-16 lg:px-12 lg:pb-28">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3.5 py-2 text-xs font-extrabold uppercase tracking-[.16em] text-red-700">
              <BadgeCheck className="h-4 w-4" /> Escolha com confiança
            </div>
            <h1 className="max-w-xl text-[clamp(2.7rem,5.4vw,5.3rem)] font-black leading-[.95] tracking-[-.06em] text-slate-950">
              O carro certo para o seu <span className="text-red-600">momento.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Compare opções selecionadas, veja cada detalhe em 360° e encontre uma condição que faça sentido para você.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#estoque" className="inline-flex min-h-13 items-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-extrabold text-white transition hover:bg-red-600">
                Ver carros disponíveis <ArrowRight className="h-4 w-4" />
              </a>
              <button onClick={() => document.getElementById('vehicle-match')?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex min-h-13 items-center gap-2 rounded-full border border-slate-300 bg-white px-6 text-sm font-extrabold text-slate-800 shadow-sm transition hover:border-red-300 hover:text-red-700">
                Descobrir meu modelo <Sparkles className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-9 grid max-w-lg grid-cols-3 gap-3 border-t border-slate-200 pt-6">
              <div><strong className="block text-lg font-black text-slate-950">360°</strong><span className="text-xs text-slate-500">por dentro e fora</span></div>
              <div><strong className="block text-lg font-black text-slate-950">Estoque real</strong><span className="text-xs text-slate-500">atualizado</span></div>
              <div><strong className="block text-lg font-black text-slate-950">Compra segura</strong><span className="text-xs text-slate-500">com procedência</span></div>
            </div>
          </div>

          <div className="min-w-0">
            {featured ? <>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div><p className="text-xs font-black uppercase tracking-[.18em] text-red-600">Destaque da vez</p><h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">{featured.brand} {featured.model}</h2><p className="mt-1 text-sm font-semibold text-slate-500">{featured.version} · {featured.year}</p></div>
                <button onClick={() => onSelectCar(featured)} className="hidden min-h-11 shrink-0 items-center gap-1 rounded-full bg-red-600 px-5 text-sm font-extrabold text-white hover:bg-red-500 sm:inline-flex">Conhecer <ChevronRight className="h-4 w-4" /></button>
              </div>
              <FeaturedVehicleMedia key={featured.id} car={featured} onInteractiveChange={setFeaturedPaused} />
              <div className="mt-4 flex items-center justify-between gap-3">
                {featuredCars.length > 1 ? <div className="flex items-center gap-2" aria-label="Veículos em destaque"><button onClick={() => setFeaturedIndex(index => (index - 1 + featuredCars.length) % featuredCars.length)} className="grid h-10 w-10 place-items-center rounded-full border border-slate-300 bg-white text-slate-700 hover:border-red-300 hover:text-red-600" aria-label="Destaque anterior"><ArrowLeft className="h-4 w-4" /></button><div className="flex gap-1.5">{featuredCars.map((car, index) => <button key={car.id} onClick={() => setFeaturedIndex(index)} aria-label={`Ver ${car.brand} ${car.model}`} className={`h-2 rounded-full transition-all ${index === featuredIndex ? 'w-8 bg-red-600' : 'w-2 bg-slate-300 hover:bg-slate-500'}`} />)}</div><button onClick={() => setFeaturedIndex(index => (index + 1) % featuredCars.length)} className="grid h-10 w-10 place-items-center rounded-full border border-slate-300 bg-white text-slate-700 hover:border-red-300 hover:text-red-600" aria-label="Próximo destaque"><ArrowRight className="h-4 w-4" /></button></div> : <span />}
                <button onClick={() => onSelectCar(featured)} className="inline-flex min-h-11 items-center gap-1 rounded-full bg-red-600 px-5 text-sm font-extrabold text-white sm:hidden">Conhecer <ChevronRight className="h-4 w-4" /></button>
              </div>
            </> : <div className="flex aspect-video items-center justify-center rounded-[28px] bg-slate-900 text-sm font-bold text-white">Novos veículos em breve</div>}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-10 max-w-[1380px] px-4 sm:px-8">
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

      <VehicleMatchQuiz cars={available} onSelectCar={onSelectCar} onSubmitLead={onSubmitLead} />

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
