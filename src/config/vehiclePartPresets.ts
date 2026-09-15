export type VehiclePartPresetGroup =
  | 'Rodas'
  | 'Retrovisores'
  | 'Iluminação dianteira'
  | 'Iluminação traseira'
  | 'Aberturas e motor'
  | 'Detalhes externos'
  | 'Interior';

export interface VehiclePartPreset {
  id: string;
  group: VehiclePartPresetGroup;
  title: string;
  description: string;
  instruction: string;
  viewTypes: Array<'exterior' | 'interior'>;
}

export const VEHICLE_PART_PRESETS: VehiclePartPreset[] = [
  {
    id: 'front-left-wheel',
    group: 'Rodas',
    title: 'Roda dianteira esquerda',
    description: 'Detalhe da roda e do pneu dianteiro esquerdo.',
    instruction: 'Abra um frame em que a roda dianteira esquerda esteja visível e clique no centro dela.',
    viewTypes: ['exterior'],
  },
  {
    id: 'front-right-wheel',
    group: 'Rodas',
    title: 'Roda dianteira direita',
    description: 'Detalhe da roda e do pneu dianteiro direito.',
    instruction: 'Abra um frame em que a roda dianteira direita esteja visível e clique no centro dela.',
    viewTypes: ['exterior'],
  },
  {
    id: 'rear-left-wheel',
    group: 'Rodas',
    title: 'Roda traseira esquerda',
    description: 'Detalhe da roda e do pneu traseiro esquerdo.',
    instruction: 'Abra um frame em que a roda traseira esquerda esteja visível e clique no centro dela.',
    viewTypes: ['exterior'],
  },
  {
    id: 'rear-right-wheel',
    group: 'Rodas',
    title: 'Roda traseira direita',
    description: 'Detalhe da roda e do pneu traseiro direito.',
    instruction: 'Abra um frame em que a roda traseira direita esteja visível e clique no centro dela.',
    viewTypes: ['exterior'],
  },
  {
    id: 'left-mirror',
    group: 'Retrovisores',
    title: 'Retrovisor esquerdo',
    description: 'Detalhe do retrovisor externo esquerdo.',
    instruction: 'Abra um frame lateral em que o retrovisor esquerdo esteja visível e clique no centro dele.',
    viewTypes: ['exterior'],
  },
  {
    id: 'right-mirror',
    group: 'Retrovisores',
    title: 'Retrovisor direito',
    description: 'Detalhe do retrovisor externo direito.',
    instruction: 'Abra um frame lateral em que o retrovisor direito esteja visível e clique no centro dele.',
    viewTypes: ['exterior'],
  },
  {
    id: 'front-left-light',
    group: 'Iluminação dianteira',
    title: 'Farol dianteiro esquerdo',
    description: 'Detalhe do conjunto óptico dianteiro esquerdo.',
    instruction: 'Abra um frame frontal em que o farol esquerdo esteja visível e clique no centro dele.',
    viewTypes: ['exterior'],
  },
  {
    id: 'front-right-light',
    group: 'Iluminação dianteira',
    title: 'Farol dianteiro direito',
    description: 'Detalhe do conjunto óptico dianteiro direito.',
    instruction: 'Abra um frame frontal em que o farol direito esteja visível e clique no centro dele.',
    viewTypes: ['exterior'],
  },
  {
    id: 'rear-left-light',
    group: 'Iluminação traseira',
    title: 'Lanterna traseira esquerda',
    description: 'Detalhe da lanterna traseira esquerda.',
    instruction: 'Abra um frame traseiro em que a lanterna esquerda esteja visível e clique no centro dela.',
    viewTypes: ['exterior'],
  },
  {
    id: 'rear-right-light',
    group: 'Iluminação traseira',
    title: 'Lanterna traseira direita',
    description: 'Detalhe da lanterna traseira direita.',
    instruction: 'Abra um frame traseiro em que a lanterna direita esteja visível e clique no centro dela.',
    viewTypes: ['exterior'],
  },
  {
    id: 'open-hood', group: 'Aberturas e motor', title: 'Capô aberto',
    description: 'Visão do motor e do compartimento com o capô aberto.',
    instruction: 'Abra o frame com o capô levantado e clique no centro do compartimento do motor.',
    viewTypes: ['exterior'],
  },
  {
    id: 'open-trunk', group: 'Aberturas e motor', title: 'Porta-malas aberto',
    description: 'Espaço e acabamento do porta-malas aberto.',
    instruction: 'Abra o frame com o porta-malas aberto e clique no centro do vão de carga.',
    viewTypes: ['exterior', 'interior'],
  },
  {
    id: 'engine-detail', group: 'Aberturas e motor', title: 'Detalhe do motor',
    description: 'Detalhe visual do motor e seus componentes aparentes.',
    instruction: 'Use o frame mais próximo do motor e marque o componente principal.',
    viewTypes: ['exterior'],
  },
  {
    id: 'front-grille', group: 'Detalhes externos', title: 'Grade dianteira',
    description: 'Detalhe da grade e acabamento frontal.',
    instruction: 'Abra um frame frontal e clique no centro da grade.',
    viewTypes: ['exterior'],
  },
  {
    id: 'front-bumper', group: 'Detalhes externos', title: 'Para-choque dianteiro',
    description: 'Detalhe do para-choque dianteiro.',
    instruction: 'Abra um frame frontal e clique no centro do para-choque.',
    viewTypes: ['exterior'],
  },
  {
    id: 'rear-bumper', group: 'Detalhes externos', title: 'Para-choque traseiro',
    description: 'Detalhe do para-choque traseiro.',
    instruction: 'Abra um frame traseiro e clique no centro do para-choque.',
    viewTypes: ['exterior'],
  },
  {
    id: 'front-fog-lights', group: 'Iluminação dianteira', title: 'Faróis de neblina',
    description: 'Detalhe dos faróis auxiliares ou de neblina.',
    instruction: 'Abra um frame frontal em que o farol auxiliar esteja visível e marque-o.',
    viewTypes: ['exterior'],
  },
  {
    id: 'dashboard', group: 'Interior', title: 'Painel',
    description: 'Visão geral do painel de instrumentos.',
    instruction: 'Abra um frame interno voltado ao painel e clique no centro dele.',
    viewTypes: ['interior'],
  },
  {
    id: 'multimedia', group: 'Interior', title: 'Central multimídia',
    description: 'Detalhe da central multimídia e comandos.',
    instruction: 'Abra um frame em que a tela esteja nítida e clique no centro dela.',
    viewTypes: ['interior'],
  },
  {
    id: 'steering-wheel', group: 'Interior', title: 'Volante e comandos',
    description: 'Detalhe do volante e comandos integrados.',
    instruction: 'Abra um frame voltado ao motorista e clique no centro do volante.',
    viewTypes: ['interior'],
  },
  {
    id: 'front-seats', group: 'Interior', title: 'Bancos dianteiros',
    description: 'Acabamento e conservação dos bancos dianteiros.',
    instruction: 'Abra o melhor frame dos bancos dianteiros e marque o centro do conjunto.',
    viewTypes: ['interior'],
  },
  {
    id: 'rear-seats', group: 'Interior', title: 'Bancos traseiros',
    description: 'Acabamento e espaço dos bancos traseiros.',
    instruction: 'Abra o melhor frame dos bancos traseiros e marque o centro do conjunto.',
    viewTypes: ['interior'],
  },
];

export const VEHICLE_PART_PRESET_GROUPS = Array.from(
  new Set(VEHICLE_PART_PRESETS.map((preset) => preset.group)),
);
