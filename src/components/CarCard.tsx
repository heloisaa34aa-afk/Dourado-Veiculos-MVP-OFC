import { ArrowRight, CalendarDays, CarFront, Fuel, Gauge } from 'lucide-react';
import type { Car } from '../types';
import { formatVehiclePrice } from '../utils/vehiclePresentation';

interface CarCardProps { car: Car; onSelect: (car: Car) => void }

export default function CarCard({ car, onSelect }: CarCardProps) {
  const mileage = car.km === 0 ? '0 km' : `${car.km.toLocaleString('pt-BR')} km`;

  return (
    <article onClick={() => onSelect(car)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') onSelect(car); }} role="button" tabIndex={0} className="group pressable cursor-pointer overflow-hidden rounded-[26px] border border-black/[.08] bg-white shadow-[0_12px_35px_rgba(15,23,42,.055)] [content-visibility:auto] [contain-intrinsic-size:0_480px] hover:border-red-200 hover:shadow-[0_26px_70px_rgba(15,23,42,.13)] sm:rounded-[30px]">
      <div className="image-shine relative aspect-[16/10] overflow-hidden bg-slate-200">
        {car.images[0] ? <img src={car.images[0]} alt={`${car.brand} ${car.model}`} loading="lazy" decoding="async" width={800} height={500} className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]" /> : <div className="flex h-full flex-col items-center justify-center gap-2 bg-slate-100 text-slate-400"><CarFront className="h-10 w-10" /><span className="text-xs font-bold">Foto ainda não publicada</span></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/5" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3.5 sm:p-4">
          <div className="flex flex-wrap gap-2">{car.isFeatured && <span className="rounded-full bg-red-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] text-white shadow-lg">Destaque</span>}{car.km === 0 && <span className="rounded-full border border-white/30 bg-white/95 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-lg">0 km</span>}</div>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white">
          <span className="rounded-full border border-white/20 bg-black/45 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.14em] backdrop-blur-md">{car.category}</span>
          <span className="flex items-center gap-1 text-xs font-bold opacity-90">Ver detalhes <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
        </div>
      </div>
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.2em] text-red-600">{car.brand}</p><h3 className="mt-1.5 truncate text-[22px] font-black tracking-[-.04em] text-slate-950 sm:text-2xl">{car.model}</h3><p className="mt-1 truncate text-sm font-medium text-slate-500">{car.version}</p></div>
          <strong className="shrink-0 text-right text-lg font-black tracking-[-.035em] text-slate-950">{formatVehiclePrice(car.price)}</strong>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
          <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-slate-600"><CalendarDays className="h-4 w-4 shrink-0 text-red-600" /><span className="truncate">{car.year}</span></span>
          <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-slate-600"><Gauge className="h-4 w-4 shrink-0 text-red-600" /><span className="truncate">{mileage}</span></span>
          <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-slate-600"><Fuel className="h-4 w-4 shrink-0 text-red-600" /><span className="truncate">{car.fuel}</span></span>
        </div>
      </div>
    </article>
  );
}
