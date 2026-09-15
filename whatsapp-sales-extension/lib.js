export const DEFAULT_CONFIG = Object.freeze({
  supabaseUrl: 'https://nzvwlyxbbnsillmylwtj.supabase.co',
  supabaseAnonKey: 'sb_publishable_2hfSOtqKozb3Mi9n4Lg14w_7eJnsz8s',
  siteUrl: 'https://dourado-veiculos-mvp-ofc.vercel.app'
});

export function normalizeVehicle(row) {
  const gallery = Array.isArray(row.vehicle_images)
    ? [...row.vehicle_images].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    : [];

  const cover = row.cover_image || gallery[0]?.image_url || '';
  const images = [...new Set([cover, ...gallery.map(image => image.image_url)].filter(Boolean))];
  const videos = Array.isArray(row.vehicle_videos) ? row.vehicle_videos : row.vehicle_videos ? [row.vehicle_videos] : [];

  return {
    id: row.id,
    brand: row.brand || '',
    model: row.model || '',
    version: row.version || '',
    year: row.year ? String(row.year) : '',
    price: Number(row.price || 0),
    mileage: Number(row.mileage || 0),
    transmission: row.transmission || '',
    fuel: row.fuel || '',
    color: row.color || '',
    description: row.description || '',
    features: Array.isArray(row.vehicle_features) ? row.vehicle_features.map(item => item.feature).filter(Boolean) : [],
    category: row.categories?.name || '',
    image: cover,
    images,
    videos: videos.map(video => video.video_url).filter(Boolean),
    featured: Boolean(row.featured),
    sold: Boolean(row.sold) || row.status === 'Vendido'
  };
}

export function vehicleTitle(vehicle) {
  return [vehicle.brand, vehicle.model, vehicle.version].filter(Boolean).join(' ');
}

export function vehicleUrl(vehicle, siteUrl) {
  return `${siteUrl.replace(/\/$/, '')}/veiculo/${encodeURIComponent(vehicle.id)}`;
}

function formatPrice(value) {
  if (!value) return '';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  }).format(value);
}

function formatMileage(value) {
  if (!Number.isFinite(value)) return '';
  return value === 0 ? '0 km' : `${new Intl.NumberFormat('pt-BR').format(value)} km`;
}

function featureIcon(feature) {
  const value = feature.toLocaleLowerCase('pt-BR');
  if (/(ar-condicionado|climatiza)/.test(value)) return '❄️';
  if (/(multimídia|bluetooth|android|carplay|som|rádio)/.test(value)) return '📱';
  if (/(banco|interior|couro)/.test(value)) return '💺';
  if (/(vidro|trava|alarme|chave)/.test(value)) return '🔒';
  if (/(airbag|abs|segurança|sensor|câmera)/.test(value)) return '🛡️';
  if (/(roda|pneu)/.test(value)) return '🛞';
  if (/(direção)/.test(value)) return '🎯';
  if (/(motor|turbo)/.test(value)) return '💪';
  return '✨';
}

export function composeVehicleMessage(vehicle, siteUrl, template = 'details', customerName = '') {
  return composeVehicleSequence(vehicle, siteUrl, template, customerName).join('\n\n');
}

export function composeVehicleSequence(vehicle, siteUrl, template = 'details', customerName = '') {
  const greeting = customerName ? `Olá, ${customerName}!` : 'Olá!';
  const title = vehicleTitle(vehicle);
  const url = vehicleUrl(vehicle, siteUrl);
  const facts = [
    vehicle.year && `📅 *Ano/Modelo:* ${vehicle.year}`,
    vehicle.mileage >= 0 && `🛣️ *Quilometragem:* ${formatMileage(vehicle.mileage)}`,
    vehicle.transmission && `⚙️ *Câmbio:* ${vehicle.transmission}`,
    vehicle.fuel && `⛽ *Combustível:* ${vehicle.fuel}`,
    vehicle.color && `🎨 *Cor:* ${vehicle.color}`,
    ...vehicle.features.slice(0, 12).map(feature => `${featureIcon(feature)} *${feature}*`),
    vehicle.price > 0 ? `💰 *Valor:* ${formatPrice(vehicle.price)}` : '💰 *Valor:* Consulte nossa equipe'
  ].filter(Boolean).join('\n');

  const introductions = {
    details: `${greeting} Tudo bem? 😊\nAqui é da equipe *Dourado Veículos*. Separei o ${title} que você pediu.`,
    availability: `${greeting} Tudo bem? 😊\nConfirmei o *${title}* em nosso estoque e separei as informações para você.`,
    financing: `${greeting} Tudo bem? 😊\nVou te ajudar com uma simulação para o *${title}*.`,
    tradein: `${greeting} Tudo bem? 😊\nPodemos avaliar seu carro na troca pelo *${title}*.`
  };
  const closings = {
    details: `🔗 Fotos e detalhes completos:\n${url}\n\nO que você gostaria de saber primeiro: condição de pagamento, avaliação da troca ou agendamento?`,
    availability: `🔗 Veja o veículo completo:\n${url}\n\nQual horário fica melhor para você conhecer o carro? 📅`,
    financing: `🔗 Veja o veículo completo:\n${url}\n\nPara eu montar uma simulação mais próxima do que você procura, qual seria a entrada e a quantidade de parcelas?`,
    tradein: `🔗 Veja o veículo completo:\n${url}\n\nPara uma pré-avaliação, me envie o modelo, ano, quilometragem e algumas fotos do seu carro. 🔄`
  };

  const sequence = [
    introductions[template] || introductions.details,
    `🚘 *${title}*\n\n${facts}${vehicle.description ? `\n\n📝 ${vehicle.description}` : ''}`,
    closings[template] || closings.details
  ];

  return sequence.filter(Boolean);
}

export function filterVehicles(vehicles, query) {
  const normalized = query.trim().toLocaleLowerCase('pt-BR');
  if (!normalized) return vehicles;
  return vehicles.filter(vehicle => [vehicle.brand, vehicle.model, vehicle.version, vehicle.year, vehicle.category]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('pt-BR')
    .includes(normalized));
}
