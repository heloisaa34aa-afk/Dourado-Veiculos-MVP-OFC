import { describe, expect, it } from 'vitest';
import { VEHICLE_PART_PRESETS } from './vehiclePartPresets';

describe('vehicle part tracking presets', () => {
  it('covers wheels, mirrors and front/rear lighting with unique identifiers', () => {
    const groups = new Set(VEHICLE_PART_PRESETS.map((preset) => preset.group));
    const ids = VEHICLE_PART_PRESETS.map((preset) => preset.id);

    expect(groups).toEqual(new Set([
      'Rodas',
      'Retrovisores',
      'Iluminação dianteira',
      'Iluminação traseira',
    ]));
    expect(new Set(ids).size).toBe(ids.length);
    expect(VEHICLE_PART_PRESETS.every((preset) => preset.instruction.length > 20)).toBe(true);
  });
});
