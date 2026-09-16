import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, BadgeCheck, Banknote, CarFront, ChevronRight,
  Headphones, Images, Search, ShieldCheck, Sparkles,
} from 'lucide-react';
import type { Car, LeadMessage } from '../types';
import type { SiteBanner } from '../services/banner.service';
import CarCard from '../components/CarCard';
import { PublicPromotion } from '../components/PublicPromotion';
import { VehicleMatchQuiz } from '../components/VehicleMatchQuiz';
import { catalogUrl, derivePriceBands, formatCompactPrice, vehicleYear, type VehicleCondition } from '../utils/vehicleCatalog';

interface ShowroomHomeProps {
  cars: Car[];
  loading: boolean;
  carsError: string | null;
  banners: SiteBanner[];
  onSelectCar: (car: Car) => void;
  onSubmitLead: (lead: Omit<LeadMessage, 'id' | 'createdAt' | 'status'>) => Promise<void> | void;
}

function FeaturedVehicleMedia({ car }: { car: Car }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [displayedImage, setDisplayedImage] = useState(car.images[0] || '');
  const images = car.images;
  const targetImage = images[photoIndex % Math.max(images.length, 1)] || '';

  useEffect(() => {
    setPhotoIndex(0);
  }, [car.id]);

  useEffect(() => {
    if (images.length < 2) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setPhotoIndex(index => (index + 1) % images.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [images.length]);

  useEffect(() => {
    if (!targetImage) {
      setDisplayedImage('');
      return;
    }
    let active = true;
    const nextImage = new Image();
    const showDecodedImage = () => { if (active) setDisplayedImage(targetImage); };
    nextImage.onload = showDecodedImage;
    nextImage.src = targetImage;
    if (nextImage.complete) showDecodedImage();
    else if (typeof nextImage.decode === 'function') void nextImage.decode().then(showDecodedImage).catch(() => undefined);
    return () => { active = false; nextImage.onload = null; };
  }, [targetImage]);

  return <div className="overflow-hidden rounded-[28px] border border-white/15 bg-black/45 shadow-[0_30px_90px_rgba(0,0,0,.45)] backdrop-blur">
    <div className="relative aspect-[4/3] overflow-hidden bg-[#080a0e] sm:aspect-video">
      {displayedImage
        ? <img src={displayedImage} alt={`${car.brand} ${car.model}`} className="h-full w-full object-cover" fetchPriority="high" decoding="async" />
        : <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400"><CarFront className="h-12 w-12" /><span className="text-sm font-bold">Foto ainda não publicada</span></div>}

      {images.length > 0 && <div className="pointer-events-none absolute right-3 top-3 flex min-h-9 items-center gap-1.5 rounded-full border border-white/15 bg-black/65 px-3 text-xs font-extrabold text-white backdrop-blur"><Images className="h-4 w-4" /> {photoIndex + 1}/{images.length}</div>}
      {images.length > 1 && <div className="absolute bottom-3 right-3 flex gap-1.5">{images.slice(0, 8).map((_, index) => <button key={index} onClick={() => setPhotoIndex(index)} aria-label={`Ver foto ${index + 1}`} className={`h-1.5 rounded-full ${index === photoIndex % images.length ? 'w-7 bg-red-500' : 'w-1.5 bg-white/60'}`} />)}</div>}
    </div>
  </div>;
}

export default function ShowroomHome({ cars, loading, carsError, banners, onSelectCar, onSubmitLead }: ShowroomHomeProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('Todos');
  const [condition, setCondition] = useState<VehicleCondition>('');
  const [fuel, setFuel] = useState('');
  const [minYear, setMinYear] = useState('');
  const [maxMileage, setMaxMileage] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
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
  const discoveryCars = useMemo(() => [...available].sort((a, b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) || new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 6), [available]);
  const featured = featuredCars[featuredIndex % Math.max(featuredCars.length, 1)];
  const brands = useMemo(() => ['Todos', ...Array.from(new Set(available.map(car => car.brand))).sort()], [available]);
  const fuels = useMemo(() => Array.from(new Set(available.map(car => car.fuel).filter(Boolean))).sort(), [available]);
  const years = useMemo(() => Array.from(new Set(available.map(vehicleYear).filter(Boolean))).sort((a, b) => b - a), [available]);
  const categories = useMemo(() => ['Todos', ...Array.from(new Set(available.map(car => car.category))).sort()], [available]);
  const priceBands = useMemo(() => derivePriceBands(available), [available]);

  useEffect(() => {
    if (featuredCars.length < 2) return;
    const timer = window.setInterval(() => setFeaturedIndex(index => (index + 1) % featuredCars.length), 6500);
    return () => window.clearInterval(timer);
  }, [featuredCars.length]);

  useEffect(() => {
    featuredCars.forEach(car => {
      if (!car.images[0]) return;
      const image = new Image();
      image.src = car.images[0];
    });
  }, [featuredCars]);

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

  const submitCatalogSearch = (event: FormEvent) => {
    event.preventDefault();
    navigate(catalogUrl({
      query: search,
      brand: brand === 'Todos' ? undefined : brand,
      condition,
      fuel: fuel || undefined,
      minYear: minYear ? Number(minYear) : undefined,
      maxMileage: maxMileage ? Number(maxMileage) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sort: 'recent',
    }));
  };

  if (loading && cars.length === 0) {
    return (
      <main aria-busy="true" className="min-h-screen bg-[#f3f4f6] px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-[1380px] animate-pulse">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="space-y-5"><div className="h-8 w-44 rounded-full bg-slate-200"/><div className="h-16 max-w-xl rounded-2xl bg-slate-200 sm:h-28"/><div className="h-6 max-w-lg rounded bg-slate-200"/></div>
            <div className="aspect-video rounded-[28px] bg-slate-900/90" />
          </div>
          <div className="mt-12 h-24 rounded-[28px] bg-white shadow-sm" />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{[0,1,2].map(item => <div key={item} className="aspect-[4/3] rounded-[28px] bg-white" />)}</div>
        </div>
      </main>
    );
  }

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
              Encontre opções selecionadas para o seu momento, compare os detalhes e escolha com segurança.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => navigate('/estoque')} className="inline-flex min-h-13 items-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-extrabold text-white transition hover:bg-red-600">
                Ver carros disponíveis <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => document.getElementById('vehicle-match')?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex min-h-13 items-center gap-2 rounded-full border border-slate-300 bg-white px-6 text-sm font-extrabold text-slate-800 shadow-sm transition hover:border-red-300 hover:text-red-700">
                Descobrir meu modelo <Sparkles className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-9 grid max-w-lg grid-cols-3 gap-3 border-t border-slate-200 pt-6">
              <div><strong className="block text-lg font-black text-slate-950">Compra segura</strong><span className="text-xs text-slate-500">com transparência</span></div>
              <div><strong className="block text-lg font-black text-slate-950">Estoque real</strong><span className="text-xs text-slate-500">atualizado</span></div>
              <div><strong className="block text-lg font-black text-slate-950">Compare</strong><span className="text-xs text-slate-500">dados disponíveis</span></div>
            </div>
          </div>

          <div className="min-w-0">
            {featured ? <>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div><p className="text-xs font-black uppercase tracking-[.18em] text-red-600">Destaque da vez</p><h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">{featured.brand} {featured.model}</h2><p className="mt-1 text-sm font-semibold text-slate-500">{featured.version} · {featured.year}</p></div>
                <button onClick={() => onSelectCar(featured)} className="hidden min-h-11 shrink-0 items-center gap-1 rounded-full bg-red-600 px-5 text-sm font-extrabold text-white hover:bg-red-500 sm:inline-flex">Conhecer <ChevronRight className="h-4 w-4" /></button>
              </div>
              <FeaturedVehicleMedia car={featured} />
              <div className="mt-4 flex items-center justify-between gap-3">
                {featuredCars.length > 1 ? <div className="flex items-center gap-2" aria-label="Veículos em destaque"><button onClick={() => setFeaturedIndex(index => (index - 1 + featuredCars.length) % featuredCars.length)} className="grid h-10 w-10 place-items-center rounded-full border border-slate-300 bg-white text-slate-700 hover:border-red-300 hover:text-red-600" aria-label="Destaque anterior"><ArrowLeft className="h-4 w-4" /></button><div className="flex gap-1.5">{featuredCars.map((car, index) => <button key={car.id} onClick={() => setFeaturedIndex(index)} aria-label={`Ver ${car.brand} ${car.model}`} className={`h-2 rounded-full transition-all ${index === featuredIndex ? 'w-8 bg-red-600' : 'w-2 bg-slate-300 hover:bg-slate-500'}`} />)}</div><button onClick={() => setFeaturedIndex(index => (index + 1) % featuredCars.length)} className="grid h-10 w-10 place-items-center rounded-full border border-slate-300 bg-white text-slate-700 hover:border-red-300 hover:text-red-600" aria-label="Próximo destaque"><ArrowRight className="h-4 w-4" /></button></div> : <span />}
                <button onClick={() => onSelectCar(featured)} className="inline-flex min-h-11 items-center gap-1 rounded-full bg-red-600 px-5 text-sm font-extrabold text-white sm:hidden">Conhecer <ChevronRight className="h-4 w-4" /></button>
              </div>
            </> : <div className="flex aspect-video items-center justify-center rounded-[28px] bg-slate-900 text-sm font-bold text-white">Novos veículos em breve</div>}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1380px] px-4 py-8 sm:px-8 sm:py-10">
        <div className="rounded-[28px] border border-black/5 bg-white p-4 shadow-[0_30px_80px_rgba(15,23,42,.16)] sm:p-6">
          <div className="mb-4"><p className="text-xs font-black uppercase tracking-[.16em] text-red-600">Busca inteligente</p><h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">Filtre o estoque do seu jeito</h2></div>
          <form onSubmit={submitCatalogSearch} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex min-h-14 items-center gap-3 rounded-2xl bg-slate-100 px-4 focus-within:ring-2 focus-within:ring-red-500 sm:col-span-2">
              <Search className="h-5 w-5 text-slate-400" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Busque por modelo, versão ou combustível" className="min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:text-slate-400" />
            </label>
            <select aria-label="Filtrar por marca" value={brand} onChange={event => setBrand(event.target.value)} className="min-h-14 rounded-2xl border-0 bg-slate-100 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500">
              {brands.map(item => <option key={item}>{item}</option>)}
            </select>
            <select aria-label="Filtrar por condição" value={condition} onChange={event => setCondition(event.target.value as VehicleCondition)} className="min-h-14 rounded-2xl border-0 bg-slate-100 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500"><option value="">Usados e 0 km</option><option value="zero-km">Somente 0 km</option><option value="used">Somente usados</option></select>
            <select aria-label="Filtrar por combustível" value={fuel} onChange={event => setFuel(event.target.value)} className="min-h-14 rounded-2xl border-0 bg-slate-100 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500"><option value="">Todos os combustíveis</option>{fuels.map(item => <option key={item}>{item}</option>)}</select>
            <select aria-label="Filtrar por ano mínimo" value={minYear} onChange={event => setMinYear(event.target.value)} className="min-h-14 rounded-2xl border-0 bg-slate-100 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500"><option value="">Qualquer ano</option>{years.map(item => <option key={item} value={item}>A partir de {item}</option>)}</select>
            <select aria-label="Filtrar por quilometragem" value={maxMileage} onChange={event => setMaxMileage(event.target.value)} className="min-h-14 rounded-2xl border-0 bg-slate-100 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500"><option value="">Qualquer quilometragem</option><option value="0">0 km</option><option value="30000">Até 30.000 km</option><option value="60000">Até 60.000 km</option><option value="100000">Até 100.000 km</option></select>
            <select aria-label="Filtrar por preço máximo" value={maxPrice} onChange={event => setMaxPrice(event.target.value)} className="min-h-14 rounded-2xl border-0 bg-slate-100 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500"><option value="">Qualquer preço</option><option value="70000">Até R$ 70 mil</option><option value="100000">Até R$ 100 mil</option><option value="150000">Até R$ 150 mil</option><option value="200000">Até R$ 200 mil</option><option value="300000">Até R$ 300 mil</option></select>
            <button type="submit" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 text-sm font-black text-white hover:bg-red-500 sm:col-span-2 lg:col-span-1">Buscar no estoque <ArrowRight className="h-4 w-4" /></button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-[1380px] px-4 py-12 sm:px-8 lg:py-20">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-red-600"><Sparkles className="h-4 w-4" /> Seleção atual</p>
            <h2 className="text-4xl font-black tracking-[-.045em] sm:text-5xl">Carros que merecem sua atenção.</h2>
          </div>
          <button onClick={() => navigate('/estoque')} className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-slate-300 bg-white px-5 text-sm font-extrabold hover:border-red-300 hover:text-red-600">Ver estoque completo <ArrowRight className="h-4 w-4" /></button>
        </div>

        <div className="mb-8 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categories.map(item => (
            <button key={item} onClick={() => navigate(item === 'Todos' ? '/estoque' : catalogUrl({ category: item, sort: 'recent' }))} className="shrink-0 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-400 hover:text-slate-950">
              {item === 'Todos' ? 'Todos os modelos' : item}
            </button>
          ))}
        </div>

        {carsError && <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Não foi possível carregar o estoque agora. Tente novamente em instantes.</div>}
        {available.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {discoveryCars.map(car => <CarCard key={car.id} car={car} onSelect={onSelectCar} />)}
          </div>
        ) : (
          <div className="rounded-[32px] border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
            <CarFront className="mx-auto mb-4 h-9 w-9 text-slate-300" />
            <h3 className="text-xl font-black">Novos veículos serão publicados em breve.</h3>
          </div>
        )}
      </section>

      {priceBands.length > 0 && <section className="mx-auto max-w-[1380px] px-4 pb-20 sm:px-8">
        <div className="mb-6"><p className="text-xs font-black uppercase tracking-[.2em] text-red-600">Faixa de investimento</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Comece pelo valor que faz sentido.</h2></div>
        <div className="grid gap-4 md:grid-cols-3">{priceBands.map(band => <button key={band.label} onClick={() => navigate(catalogUrl({ minPrice: band.minPrice, maxPrice: band.maxPrice, sort: 'price-asc' }))} className="group rounded-[26px] border border-slate-200 bg-white p-6 text-left transition hover:-translate-y-1 hover:border-red-200 hover:shadow-xl"><span className="text-xs font-black uppercase tracking-wider text-slate-400">Explorar estoque</span><strong className="mt-3 block text-xl font-black group-hover:text-red-600">{band.label}</strong><span className="mt-2 block text-sm text-slate-500">{band.minPrice ? `A partir de ${formatCompactPrice(band.minPrice)}` : 'Opções de entrada'}{band.maxPrice ? ` · até ${formatCompactPrice(band.maxPrice)}` : ''}</span></button>)}</div>
      </section>}

      <VehicleMatchQuiz cars={available} onSelectCar={onSelectCar} onSubmitLead={onSubmitLead} />

      <div className="mx-auto max-w-[1380px] px-4 sm:px-8"><PublicPromotion banners={banners} placement="home_inline" /></div>

      <section id="advantages-section" className="mx-auto grid max-w-[1380px] gap-5 px-4 py-20 sm:px-8 lg:grid-cols-2 lg:py-28">
        <div className="flex min-h-[470px] flex-col justify-between rounded-[36px] bg-red-600 p-7 text-white sm:p-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15"><CarFront className="h-7 w-7" /></div>
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[.2em] text-red-100">Compra transparente</p>
            <h2 className="max-w-lg text-4xl font-black leading-[.98] tracking-[-.045em] sm:text-5xl">Você vê o carro antes mesmo de chegar à loja.</h2>
            <p className="mt-5 max-w-xl leading-7 text-red-50">Fotos, detalhes, pontos de interesse e observações documentadas para você conhecer melhor cada veículo.</p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {[
            [ShieldCheck, 'Informações', 'Consulte os dados disponíveis de cada veículo.'],
            [BadgeCheck, 'Detalhes', 'Compare fotos, características e observações publicadas.'],
            [Banknote, 'Financiamento', 'Solicite uma simulação inicial com a equipe.'],
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
