export const DEFAULT_CONFIG = Object.freeze({
  supabaseUrl: 'https://nzvwlyxbbnsillmylwtj.supabase.co',
  supabaseAnonKey: 'sb_publishable_2hfSOtqKozb3Mi9n4Lg14w_7eJnsz8s',
  siteUrl: 'https://dourado-veiculos-mvp-ofc.vercel.app'
});

export function normalizeVehicle(row) {
  const gallery = Array.isArray(row.vehicle_images)
    ? [...row.vehicle_images].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    : [];

  return {
    id: row.id,
    brand: row.brand || '',
    model: row.model || '',
    version: row.version || '',
    year: row.year ? String(row.year) : '',
    price: Number(row.new_price || row.price || 0),
    mileage: Number(row.mileage || 0),
    transmission: row.transmission || '',
    fuel: row.fuel || '',
    category: row.categories?.name || '',
    image: gallery[0]?.image_url || row.cover_image || '',
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

export function composeVehicleMessage(vehicle, siteUrl, template = 'details', customerName = '') {
  const greeting = customerName ? `Olá, ${customerName}!` : 'Olá!';
  const title = vehicleTitle(vehicle);
  const url = vehicleUrl(vehicle, siteUrl);
  const facts = [
    vehicle.year && `Ano: ${vehicle.year}`,
    vehicle.mileage >= 0 && `Quilometragem: ${formatMileage(vehicle.mileage)}`,
    vehicle.transmission && `Câmbio: ${vehicle.transmission}`,
    vehicle.fuel && `Combustível: ${vehicle.fuel}`,
    vehicle.price > 0 && `Valor: ${formatPrice(vehicle.price)}`
  ].filter(Boolean).join('\n');

  const messages = {
    details: `${greeting} Separei os dados do *${title}* para você:\n\n${facts}\n\nFotos e informações completas:\n${url}`,
    availability: `${greeting} O *${title}* está disponível em nosso estoque. Posso confirmar as condições e organizar uma visita ou apresentação para você.\n\n${url}`,
    financing: `${greeting} Podemos simular as condições de financiamento do *${title}*. Para preparar uma proposta, me diga o valor de entrada e em quantas parcelas você pretende pagar.\n\n${url}`,
    tradein: `${greeting} Podemos avaliar seu veículo como parte do pagamento do *${title}*. Me envie modelo, ano, quilometragem e algumas fotos do seu carro para iniciarmos a avaliação.\n\n${url}`
  };

  return messages[template] || messages.details;
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
