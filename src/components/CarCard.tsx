import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import type { Car } from '../types';

interface CarCardProps { car: Car; onSelect: (car: Car) => void }

export default function CarCard({ car, onSelect }: CarCardProps) {
  return (
    <article onClick={() => onSelect(car)} className="group cursor-pointer overflow-hidden rounded-[28px] border border-slate-200 bg-white transition duration-300 [content-visibility:auto] [contain-intrinsic-size:0_470px] hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_24px_65px_rgba(15,23,42,.12)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-200">
        <img src={car.images[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800'} alt={`${car.brand} ${car.model}`} loading="lazy" decoding="async" width={800} height={500} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <div className="flex gap-2">{car.isFeatured && <span className="rounded-full bg-red-600 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-white">Destaque</span>}{car.km === 0 && <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-950">0 km</span>}</div>
          <span className="grid h-10 w-10 translate-y-1 place-items-center rounded-full bg-white text-slate-950 opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100"><ArrowUpRight className="h-5 w-5" /></span>
        </div>
      </div>
      <div className="p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[.16em] text-red-600">{car.brand}</p>
        <h3 className="mt-2 text-2xl font-black tracking-[-.035em] text-slate-950">{car.model}</h3>
        <p className="mt-1 truncate text-sm text-slate-500">{car.version}</p>
        <div className="mt-6 grid grid-cols-3 border-y border-slate-100 py-4 text-sm">
          <div><span className="block text-[11px] font-bold uppercase text-slate-400">Ano</span><strong>{car.year}</strong></div>
          <div className="border-x border-slate-100 px-4"><span className="block text-[11px] font-bold uppercase text-slate-400">Km</span><strong>{car.km === 0 ? 'Zero' : `${Math.round(car.km / 1000)} mil`}</strong></div>
          <div className="pl-4"><span className="block text-[11px] font-bold uppercase text-slate-400">Câmbio</span><strong className="block truncate">{car.gearbox}</strong></div>
        </div>
        <div className="mt-5 flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-bold text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Inspecionado</span><span className="text-sm font-black text-slate-950">Ver veículo</span></div>
      </div>
    </article>
  );
}
