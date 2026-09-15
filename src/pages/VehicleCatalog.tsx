import { useMemo, useState } from 'react';
import { ArrowLeft, Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CarCard from '../components/CarCard';
import type { Car } from '../types';
import { catalogUrl, filterCatalog, readCatalogFilters, vehicleYear, type CatalogFilters, type CatalogSort } from '../utils/vehicleCatalog';

interface VehicleCatalogProps {
  cars: Car[];
  loading: boolean;
  error: string | null;
  onSelectCar: (car: Car) => void;
}

export default function VehicleCatalog({ cars, loading, error, onSelectCar }: VehicleCatalogProps) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const filters = useMemo(() => readCatalogFilters(params), [params]);
  const available = useMemo(() => cars.filter(car => !car.isSold), [cars]);
  const results = useMemo(() => filterCatalog(cars, filters), [cars, filters]);
  const brands = useMemo(() => Array.from(new Set(available.map(car => car.brand))).sort(), [available]);
  const categories = useMemo(() => Array.from(new Set(available.map(car => String(car.category)))).sort(), [available]);
  const years = useMemo(() => Array.from(new Set(available.map(vehicleYear).filter(Boolean))).sort((a, b) => b - a), [available]);

  const update = (patch: Partial<CatalogFilters>) => navigate(catalogUrl({ ...filters, ...patch }), { replace: true });
  const clear = () => navigate('/estoque', { replace: true });
  const activeFilterCount = [filters.brand, filters.category, filters.minPrice, filters.maxPrice, filters.minYear, filters.maxMileage].filter(value => value !== '' && value !== undefined).length;

  return (
    <main className="min-h-screen bg-[#f3f4f6] text-slate-950">
      <section className="border-b border-white/10 bg-[#090b10] px-4 py-10 text-white sm:px-8 sm:py-14">
        <div className="mx-auto max-w-[1380px]">
          <button onClick={() => navigate('/')} className="mb-7 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" /> Voltar ao início</button>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs font-black uppercase tracking-[.2em] text-red-500">Estoque Dourado</p><h1 className="mt-2 text-4xl font-black tracking-[-.05em] sm:text-6xl">Encontre seu próximo carro.</h1></div>
            <p className="text-sm text-slate-400">{results.length} veículo{results.length === 1 ? '' : 's'} encontrado{results.length === 1 ? '' : 's'}</p>
          </div>
          <label className="mt-8 flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4 text-slate-950 shadow-xl sm:max-w-3xl">
            <Search className="h-5 w-5 text-slate-400" />
            <input aria-label="Buscar veículos" value={filters.query} onChange={event => update({ query: event.target.value })} placeholder="Marca, modelo, versão ou ano" className="min-w-0 flex-1 bg-transparent text-base outline-none" />
            {filters.query && <button onClick={() => update({ query: '' })} aria-label="Limpar busca"><X className="h-5 w-5" /></button>}
          </label>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1380px] gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[280px_1fr] lg:py-12">
        <aside className="hidden self-start rounded-[26px] border border-slate-200 bg-white p-5 lg:block lg:sticky lg:top-28">
          <div className="mb-5 flex items-center justify-between"><h2 className="font-black">Filtros</h2>{activeFilterCount > 0 && <button onClick={clear} className="text-xs font-bold text-red-600">Limpar</button>}</div>
          <FilterFields filters={filters} brands={brands} categories={categories} years={years} update={update} />
        </aside>

        <section className="min-w-0">
          <div className="mb-6 flex items-center justify-between gap-3">
            <button onClick={() => setMobileFiltersOpen(true)} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-bold text-white lg:hidden"><Filter className="h-4 w-4" /> Filtros {activeFilterCount > 0 && `(${activeFilterCount})`}</button>
            <select aria-label="Ordenar veículos" value={filters.sort} onChange={event => update({ sort: event.target.value as CatalogSort })} className="ml-auto min-h-12 max-w-[190px] rounded-full border border-slate-300 bg-white px-4 text-sm font-bold outline-none focus:border-red-500">
              <option value="recent">Mais recentes</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option><option value="km-asc">Menor quilometragem</option><option value="year-desc">Maior ano</option>
            </select>
          </div>

          {loading && cars.length === 0 ? <div aria-busy="true" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{[0,1,2,3,4,5].map(item => <div key={item} className="h-[430px] animate-pulse rounded-[28px] bg-white" />)}</div>
            : error && cars.length === 0 ? <CatalogMessage title="Não foi possível carregar o estoque" copy="Tente novamente em alguns instantes." />
            : results.length === 0 ? <CatalogMessage title="Nenhum veículo encontrado" copy="Ajuste os filtros ou veja novamente todo o estoque." action={clear} />
            : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{results.map(car => <CarCard key={car.id} car={car} onSelect={onSelectCar} />)}</div>}
        </section>
      </div>

      {mobileFiltersOpen && <div className="fixed inset-0 z-[1000] flex items-end bg-black/65 lg:hidden" role="dialog" aria-modal="true" aria-label="Filtros do estoque" onClick={() => setMobileFiltersOpen(false)}>
        <div className="max-h-[88dvh] w-full overflow-y-auto rounded-t-[30px] bg-white p-5 pb-8" onClick={event => event.stopPropagation()}>
          <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-red-600">Refine sua busca</p><h2 className="text-2xl font-black">Filtros</h2></div><button onClick={() => setMobileFiltersOpen(false)} className="grid h-11 w-11 place-items-center rounded-full bg-slate-100" aria-label="Fechar filtros"><X className="h-5 w-5" /></button></div>
          <FilterFields filters={filters} brands={brands} categories={categories} years={years} update={update} />
          <div className="mt-6 grid grid-cols-2 gap-3"><button onClick={clear} className="min-h-12 rounded-2xl border border-slate-300 font-bold">Limpar</button><button onClick={() => setMobileFiltersOpen(false)} className="min-h-12 rounded-2xl bg-red-600 font-bold text-white">Ver {results.length} veículos</button></div>
        </div>
      </div>}
    </main>
  );
}

function FilterFields({ filters, brands, categories, years, update }: { filters: CatalogFilters; brands: string[]; categories: string[]; years: number[]; update: (patch: Partial<CatalogFilters>) => void }) {
  return <div className="space-y-5">
    <FilterSelect label="Marca" value={filters.brand} onChange={value => update({ brand: value })} options={brands} />
    <FilterSelect label="Categoria" value={filters.category} onChange={value => update({ category: value })} options={categories} />
    <div><span className="mb-2 block text-sm font-bold">Faixa de preço</span><div className="grid grid-cols-2 gap-2"><NumberFilter label="Mínimo" value={filters.minPrice} onChange={value => update({ minPrice: value })} /><NumberFilter label="Máximo" value={filters.maxPrice} onChange={value => update({ maxPrice: value })} /></div></div>
    <label className="block"><span className="mb-2 block text-sm font-bold">Ano mínimo</span><select value={filters.minYear ?? ''} onChange={event => update({ minYear: event.target.value ? Number(event.target.value) : undefined })} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3"><option value="">Todos</option>{years.map(year => <option key={year} value={year}>{year}</option>)}</select></label>
    <label className="block"><span className="mb-2 block text-sm font-bold">Quilometragem máxima</span><select value={filters.maxMileage ?? ''} onChange={event => update({ maxMileage: event.target.value ? Number(event.target.value) : undefined })} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3"><option value="">Todas</option><option value="0">Somente 0 km</option><option value="30000">Até 30.000 km</option><option value="60000">Até 60.000 km</option><option value="100000">Até 100.000 km</option></select></label>
  </div>;
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold">{label}</span><select aria-label={label} value={value} onChange={event => onChange(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3"><option value="">Todas</option>{options.map(option => <option key={option}>{option}</option>)}</select></label>;
}

function NumberFilter({ label, value, onChange }: { label: string; value?: number; onChange: (value?: number) => void }) {
  return <label><span className="sr-only">Preço {label.toLowerCase()}</span><input type="number" inputMode="numeric" min="0" step="1000" value={value ?? ''} onChange={event => onChange(event.target.value ? Number(event.target.value) : undefined)} placeholder={label} className="min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm" /></label>;
}

function CatalogMessage({ title, copy, action }: { title: string; copy: string; action?: () => void }) {
  return <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-5 py-20 text-center"><SlidersHorizontal className="mx-auto h-9 w-9 text-slate-300" /><h2 className="mt-4 text-2xl font-black">{title}</h2><p className="mt-2 text-sm text-slate-500">{copy}</p>{action && <button onClick={action} className="mt-5 rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white">Ver estoque completo</button>}</div>;
}
