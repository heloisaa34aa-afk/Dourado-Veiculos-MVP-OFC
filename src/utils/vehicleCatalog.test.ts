import { describe, expect, it } from 'vitest';
import type { Car } from '../types';
import { catalogUrl, derivePriceBands, filterCatalog, readCatalogFilters, vehicleYear } from './vehicleCatalog';

const car = (overrides: Partial<Car>): Car => ({
  id: 'car-1', brand: 'Fiat', model: 'Pulse', version: 'Drive', price: 90000,
  year: '2023/2024', km: 22000, gearbox: 'Automático', fuel: 'Flex', color: 'Cinza',
  plateEnd: '5', description: '', images: [], features: [], category: 'SUV', views: 0,
  whatsappClicks: 0, createdAt: '2026-08-10T10:00:00Z', ...overrides,
});

describe('vehicleCatalog', () => {
  const cars = [
    car({ id: 'pulse', price: 90000 }),
    car({ id: 'argo', model: 'Argo', category: 'Hatch', price: 70000, year: '2021/2022', km: 61000, createdAt: '2026-08-12T10:00:00Z' }),
    car({ id: 'corolla', brand: 'Toyota', model: 'Corolla', category: 'Sedan', price: 145000, year: '2025', km: 8000 }),
    car({ id: 'sold', isSold: true, price: 50000 }),
  ];

  it('lê filtros válidos da URL e ignora ordenação inválida', () => {
    const filters = readCatalogFilters(new URLSearchParams('q=corolla&marca=Toyota&anoMin=2023&kmMax=10000&ordem=invalida'));
    expect(filters).toMatchObject({ query: 'corolla', brand: 'Toyota', minYear: 2023, maxMileage: 10000, sort: 'recent' });
  });

  it('filtra texto, categoria, preço, ano e quilometragem sem exibir vendidos', () => {
    const result = filterCatalog(cars, { query: 'corolla', brand: 'Toyota', category: 'Sedan', minPrice: 100000, maxPrice: 150000, minYear: 2024, maxMileage: 10000, sort: 'recent' });
    expect(result.map(item => item.id)).toEqual(['corolla']);
  });

  it('ordena por preço, quilometragem e ano', () => {
    const base = { query: '', brand: '', category: '' };
    expect(filterCatalog(cars, { ...base, sort: 'price-asc' }).map(item => item.id)).toEqual(['argo', 'pulse', 'corolla']);
    expect(filterCatalog(cars, { ...base, sort: 'km-asc' }).map(item => item.id)).toEqual(['corolla', 'pulse', 'argo']);
    expect(filterCatalog(cars, { ...base, sort: 'year-desc' }).map(item => item.id)[0]).toBe('corolla');
  });

  it('mantém filtros compartilháveis na URL', () => {
    expect(catalogUrl({ query: 'pulse', category: 'SUV', maxPrice: 100000, sort: 'price-asc' })).toBe('/estoque?q=pulse&categoria=SUV&precoMax=100000&ordem=price-asc');
  });

  it('deriva faixas de preço do estoque real', () => {
    const bands = derivePriceBands(cars);
    expect(bands).toHaveLength(3);
    expect(bands[0].maxPrice).toBeGreaterThanOrEqual(70000);
    expect(bands[2].minPrice).toBeGreaterThan(bands[0].maxPrice!);
    expect(vehicleYear(cars[0])).toBe(2024);
  });
});
