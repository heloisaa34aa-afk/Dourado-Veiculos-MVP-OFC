import { describe, expect, it } from 'vitest';
import { VEHICLE_PART_PRESETS } from './vehiclePartPresets';

describe('vehicle part tracking presets', () => {
  it('covers exterior, openings and interior with unique identifiers', () => {
    const groups = new Set(VEHICLE_PART_PRESETS.map((preset) => preset.group));
    const ids = VEHICLE_PART_PRESETS.map((preset) => preset.id);

    expect(groups).toEqual(new Set([
      'Rodas',
      'Retrovisores',
      'Iluminação dianteira',
      'Iluminação traseira',
      'Aberturas e motor',
      'Detalhes externos',
      'Interior',
    ]));
    expect(new Set(ids).size).toBe(ids.length);
    expect(VEHICLE_PART_PRESETS.every((preset) => preset.instruction.length > 20)).toBe(true);
    expect(VEHICLE_PART_PRESETS.every((preset) => preset.viewTypes.length > 0)).toBe(true);
    expect(VEHICLE_PART_PRESETS.some((preset) => preset.id === 'open-hood')).toBe(true);
    expect(VEHICLE_PART_PRESETS.some((preset) => preset.id === 'multimedia' && preset.viewTypes.includes('interior'))).toBe(true);
  });
});
