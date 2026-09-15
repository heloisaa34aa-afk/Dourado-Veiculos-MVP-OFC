import type { Car } from '../types';

export type CatalogSort = 'recent' | 'price-asc' | 'price-desc' | 'km-asc' | 'year-desc';

export interface CatalogFilters {
  query: string;
  brand: string;
  category: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxMileage?: number;
  sort: CatalogSort;
}

export interface PriceBand {
  label: string;
  minPrice?: number;
  maxPrice?: number;
}

const validSorts: CatalogSort[] = ['recent', 'price-asc', 'price-desc', 'km-asc', 'year-desc'];

function positiveNumber(value: string | null) {
  if (value === null || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function vehicleYear(car: Car) {
  const years = String(car.year).match(/\d{4}/g)?.map(Number) || [];
  return years.length ? Math.max(...years) : 0;
}

export function readCatalogFilters(params: URLSearchParams): CatalogFilters {
  const sort = params.get('ordem') as CatalogSort | null;
  return {
    query: params.get('q')?.trim() || '',
    brand: params.get('marca')?.trim() || '',
    category: params.get('categoria')?.trim() || '',
    minPrice: positiveNumber(params.get('precoMin')),
    maxPrice: positiveNumber(params.get('precoMax')),
    minYear: positiveNumber(params.get('anoMin')),
    maxMileage: positiveNumber(params.get('kmMax')),
    sort: sort && validSorts.includes(sort) ? sort : 'recent',
  };
}

export function filterCatalog(cars: Car[], filters: CatalogFilters) {
  const query = filters.query.toLocaleLowerCase('pt-BR');
  return cars
    .filter(car => !car.isSold)
    .filter(car => {
      const text = `${car.brand} ${car.model} ${car.version} ${car.year}`.toLocaleLowerCase('pt-BR');
      return (!query || text.includes(query))
        && (!filters.brand || car.brand === filters.brand)
        && (!filters.category || car.category === filters.category)
        && (filters.minPrice === undefined || car.price >= filters.minPrice)
        && (filters.maxPrice === undefined || car.price <= filters.maxPrice)
        && (filters.minYear === undefined || vehicleYear(car) >= filters.minYear)
        && (filters.maxMileage === undefined || car.km <= filters.maxMileage);
    })
    .sort((a, b) => {
      if (filters.sort === 'price-asc') return a.price - b.price;
      if (filters.sort === 'price-desc') return b.price - a.price;
      if (filters.sort === 'km-asc') return a.km - b.km;
      if (filters.sort === 'year-desc') return vehicleYear(b) - vehicleYear(a);
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
}

function roundCommercial(value: number) {
  const step = value >= 150000 ? 25000 : value >= 80000 ? 10000 : 5000;
  return Math.max(step, Math.ceil(value / step) * step);
}

export function derivePriceBands(cars: Car[]): PriceBand[] {
  const prices = cars.filter(car => !car.isSold && car.price > 0).map(car => car.price).sort((a, b) => a - b);
  if (!prices.length) return [];
  const first = roundCommercial(prices[Math.floor((prices.length - 1) * 0.4)]);
  const second = Math.max(first + 5000, roundCommercial(prices[Math.floor((prices.length - 1) * 0.75)]));
  return [
    { label: `Até ${formatCompactPrice(first)}`, maxPrice: first },
    { label: `${formatCompactPrice(first)} a ${formatCompactPrice(second)}`, minPrice: first, maxPrice: second },
    { label: `Acima de ${formatCompactPrice(second)}`, minPrice: second },
  ];
}

export function formatCompactPrice(value: number) {
  return value >= 1000 ? `R$ ${Math.round(value / 1000)} mil` : `R$ ${value.toLocaleString('pt-BR')}`;
}

export function catalogUrl(filters: Partial<CatalogFilters>) {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.brand) params.set('marca', filters.brand);
  if (filters.category) params.set('categoria', filters.category);
  if (filters.minPrice !== undefined) params.set('precoMin', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('precoMax', String(filters.maxPrice));
  if (filters.minYear !== undefined) params.set('anoMin', String(filters.minYear));
  if (filters.maxMileage !== undefined) params.set('kmMax', String(filters.maxMileage));
  if (filters.sort && filters.sort !== 'recent') params.set('ordem', filters.sort);
  const query = params.toString();
  return `/estoque${query ? `?${query}` : ''}`;
}
