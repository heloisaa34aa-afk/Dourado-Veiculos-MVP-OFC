import { describe, expect, it } from 'vitest';
import { mapDbToCar } from './vehicle.service';

describe('vehicle media mapping', () => {
  it('keeps the cover first and removes duplicated gallery URLs', () => {
    const car = mapDbToCar({
      id: 'car-1',
      brand: 'Toyota',
      model: 'Corolla',
      price: 125000,
      fipe_price: 132500,
      market_price: 135000,
      reference_price_updated_at: '2026-09-01',
      cover_image: 'cover.jpg',
      vehicle_images: [
        { image_url: 'gallery.jpg', display_order: 2 },
        { image_url: 'cover.jpg', display_order: 1 },
        { image_url: 'gallery.jpg', display_order: 3 },
      ],
    });

    expect(car.price).toBe(125000);
    expect(car.fipePrice).toBe(132500);
    expect(car.marketPrice).toBe(135000);
    expect(car.referencePriceUpdatedAt).toBe('2026-09-01');
    expect(car.images).toEqual(['cover.jpg', 'gallery.jpg']);
  });
});
