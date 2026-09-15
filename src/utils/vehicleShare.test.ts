import { describe, expect, it, vi } from 'vitest';
import { shareVehicle } from './vehicleShare';

const payload = { title: 'Toyota Corolla', text: 'Toyota Corolla 2024', url: 'https://example.com/veiculo/1' };

describe('shareVehicle', () => {
  it('usa o compartilhamento nativo quando disponível', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    expect(await shareVehicle(payload, { share })).toBe('shared');
    expect(share).toHaveBeenCalledWith(payload);
  });

  it('copia o link quando o compartilhamento nativo não está disponível', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareVehicle(payload, { clipboard: { writeText } })).toBe('copied');
    expect(writeText).toHaveBeenCalledWith(payload.url);
  });

  it('não copia quando o usuário cancela o compartilhamento nativo', async () => {
    const writeText = vi.fn();
    const share = vi.fn().mockRejectedValue(new DOMException('Cancelado', 'AbortError'));
    expect(await shareVehicle(payload, { share, clipboard: { writeText } })).toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
  });
});
