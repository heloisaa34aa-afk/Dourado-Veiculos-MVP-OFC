import { describe, expect, it } from 'vitest';
import type { Car } from '../types';
import { formatVehiclePrice, vehicleCommercialLines, vehicleShareText } from './vehiclePresentation';

const car: Car = {
  id: 'car-1', brand: 'Toyota', model: 'Corolla', version: 'XEi', price: 145000,
  year: '2025/2026', km: 12000, gearbox: 'Automático', fuel: 'Flex', color: 'Prata',
  plateEnd: '1', description: 'Único dono.', images: ['foto.jpg'],
  features: ['Central multimídia', 'Ar-condicionado'], category: 'Sedan', views: 0,
  whatsappClicks: 0, createdAt: '2026-09-15T00:00:00Z',
};

describe('apresentação comercial do veículo', () => {
  it('formata o preço e usa somente os dados cadastrados', () => {
    expect(formatVehiclePrice(145000)).toContain('145.000');
    expect(formatVehiclePrice(0)).toBe('Consulte o valor');
    expect(vehicleCommercialLines(car)).toEqual(expect.arrayContaining([
      '📅 Ano/Modelo: 2025/2026',
      '⚙️ Câmbio: Automático',
      '📱 Central multimídia',
      '❄️ Ar-condicionado',
    ]));
  });

  it('gera uma descrição completa para compartilhamento', () => {
    const text = vehicleShareText(car, 'https://dourado.test/veiculo/car-1');
    expect(text).toContain('Toyota Corolla XEi');
    expect(text).toContain('Único dono.');
    expect(text).toContain('https://dourado.test/veiculo/car-1');
  });
});
