export type VehiclePartPresetGroup = 'Rodas' | 'Retrovisores' | 'Iluminação dianteira' | 'Iluminação traseira';

export interface VehiclePartPreset {
  id: string;
  group: VehiclePartPresetGroup;
  title: string;
  description: string;
  instruction: string;
}

export const VEHICLE_PART_PRESETS: VehiclePartPreset[] = [
  {
    id: 'front-left-wheel',
    group: 'Rodas',
    title: 'Roda dianteira esquerda',
    description: 'Detalhe da roda e do pneu dianteiro esquerdo.',
    instruction: 'Abra um frame em que a roda dianteira esquerda esteja visível e clique no centro dela.',
  },
  {
    id: 'front-right-wheel',
    group: 'Rodas',
    title: 'Roda dianteira direita',
    description: 'Detalhe da roda e do pneu dianteiro direito.',
    instruction: 'Abra um frame em que a roda dianteira direita esteja visível e clique no centro dela.',
  },
  {
    id: 'rear-left-wheel',
    group: 'Rodas',
    title: 'Roda traseira esquerda',
    description: 'Detalhe da roda e do pneu traseiro esquerdo.',
    instruction: 'Abra um frame em que a roda traseira esquerda esteja visível e clique no centro dela.',
  },
  {
    id: 'rear-right-wheel',
    group: 'Rodas',
    title: 'Roda traseira direita',
    description: 'Detalhe da roda e do pneu traseiro direito.',
    instruction: 'Abra um frame em que a roda traseira direita esteja visível e clique no centro dela.',
  },
  {
    id: 'left-mirror',
    group: 'Retrovisores',
    title: 'Retrovisor esquerdo',
    description: 'Detalhe do retrovisor externo esquerdo.',
    instruction: 'Abra um frame lateral em que o retrovisor esquerdo esteja visível e clique no centro dele.',
  },
  {
    id: 'right-mirror',
    group: 'Retrovisores',
    title: 'Retrovisor direito',
    description: 'Detalhe do retrovisor externo direito.',
    instruction: 'Abra um frame lateral em que o retrovisor direito esteja visível e clique no centro dele.',
  },
  {
    id: 'front-left-light',
    group: 'Iluminação dianteira',
    title: 'Farol dianteiro esquerdo',
    description: 'Detalhe do conjunto óptico dianteiro esquerdo.',
    instruction: 'Abra um frame frontal em que o farol esquerdo esteja visível e clique no centro dele.',
  },
  {
    id: 'front-right-light',
    group: 'Iluminação dianteira',
    title: 'Farol dianteiro direito',
    description: 'Detalhe do conjunto óptico dianteiro direito.',
    instruction: 'Abra um frame frontal em que o farol direito esteja visível e clique no centro dele.',
  },
  {
    id: 'rear-left-light',
    group: 'Iluminação traseira',
    title: 'Lanterna traseira esquerda',
    description: 'Detalhe da lanterna traseira esquerda.',
    instruction: 'Abra um frame traseiro em que a lanterna esquerda esteja visível e clique no centro dela.',
  },
  {
    id: 'rear-right-light',
    group: 'Iluminação traseira',
    title: 'Lanterna traseira direita',
    description: 'Detalhe da lanterna traseira direita.',
    instruction: 'Abra um frame traseiro em que a lanterna direita esteja visível e clique no centro dela.',
  },
];

export const VEHICLE_PART_PRESET_GROUPS = Array.from(
  new Set(VEHICLE_PART_PRESETS.map((preset) => preset.group)),
);
