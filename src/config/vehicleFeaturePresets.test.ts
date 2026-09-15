import { describe, expect, it } from 'vitest';
import { COMMON_VEHICLE_FEATURES, VEHICLE_FEATURE_GROUPS } from './vehicleFeaturePresets';

describe('vehicle feature presets', () => {
  it('offers grouped, unique quick-selection items', () => {
    const items: readonly string[] = VEHICLE_FEATURE_GROUPS.flatMap(group => group.items);

    expect(VEHICLE_FEATURE_GROUPS.map(group => group.label)).toEqual([
      'Conforto', 'Tecnologia', 'Segurança', 'Elétrica e acabamento',
    ]);
    expect(new Set(items).size).toBe(items.length);
    expect(COMMON_VEHICLE_FEATURES.every(feature => items.includes(feature))).toBe(true);
  });
});
