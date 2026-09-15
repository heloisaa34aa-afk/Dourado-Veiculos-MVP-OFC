import { describe, expect, it } from 'vitest';
import { composeVehicleMessage, filterVehicles, normalizeVehicle, vehicleUrl } from './lib.js';

const row = {
  id: 'car-1', brand: 'Toyota', model: 'Corolla', version: 'XEi', year: 2024,
  price: 120000, mileage: 15000, transmission: 'Automático', fuel: 'Flex', sold: false,
  categories: { name: 'Sedan' }, vehicle_images: [{ image_url: 'b.jpg', display_order: 2 }, { image_url: 'a.jpg', display_order: 1 }]
};

describe('extensão Dourado Vendas', () => {
  it('normaliza o veículo e respeita a ordem da galeria', () => {
    const vehicle = normalizeVehicle(row);
    expect(vehicle.image).toBe('a.jpg');
    expect(vehicle.category).toBe('Sedan');
    expect(vehicle.sold).toBe(false);
  });

  it('monta mensagem contextual sem enviar automaticamente', () => {
    const message = composeVehicleMessage(normalizeVehicle(row), 'https://dourado.test/', 'details', 'Ruben');
    expect(message).toContain('Olá, Ruben!');
    expect(message).toContain('Toyota Corolla XEi');
    expect(message).toContain('R$ 120.000');
    expect(message).toContain('https://dourado.test/veiculo/car-1');
  });

  it('filtra por modelo, categoria e ano', () => {
    const vehicles = [normalizeVehicle(row)];
    expect(filterVehicles(vehicles, 'corolla')).toHaveLength(1);
    expect(filterVehicles(vehicles, 'sedan')).toHaveLength(1);
    expect(filterVehicles(vehicles, '2024')).toHaveLength(1);
    expect(filterVehicles(vehicles, 'hilux')).toHaveLength(0);
  });

  it('codifica o identificador no link público', () => {
    expect(vehicleUrl({ id: 'car 1' }, 'https://dourado.test/')).toBe('https://dourado.test/veiculo/car%201');
  });
});
