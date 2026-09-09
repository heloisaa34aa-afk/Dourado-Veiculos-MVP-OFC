import { describe, expect, it } from 'vitest';
import { calculateContainSize, calculateCoverCrop } from './imageOptimization';

describe('imageOptimization', () => {
  it('reduz frames grandes sem ampliar imagens pequenas', () => {
    expect(calculateContainSize(4000, 3000, 1600, 1200)).toEqual({ width: 1600, height: 1200 });
    expect(calculateContainSize(800, 600, 1600, 1200)).toEqual({ width: 800, height: 600 });
  });

  it('calcula corte central no formato do banner', () => {
    expect(calculateCoverCrop(2000, 1000, 1000, 1000)).toEqual({ x: 500, y: 0, width: 1000, height: 1000 });
    expect(calculateCoverCrop(1000, 2000, 2000, 1000)).toEqual({ x: 0, y: 750, width: 1000, height: 500 });
  });
});
