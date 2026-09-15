import type { Car } from '../types';

export function formatVehiclePrice(price: number): string {
  return price > 0
    ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
    : 'Consulte o valor';
}

function featureIcon(feature: string): string {
  const normalized = feature.toLocaleLowerCase('pt-BR');
  if (/(ar-condicionado|climatiza)/.test(normalized)) return '❄️';
  if (/(multimídia|bluetooth|android|carplay|som|rádio)/.test(normalized)) return '📱';
  if (/(banco|interior|couro)/.test(normalized)) return '💺';
  if (/(vidro|trava|alarme|chave)/.test(normalized)) return '🔒';
  if (/(airbag|abs|segurança|sensor|câmera)/.test(normalized)) return '🛡️';
  if (/(roda|pneu)/.test(normalized)) return '🛞';
  if (/(direção)/.test(normalized)) return '🎯';
  if (/(motor|turbo)/.test(normalized)) return '💪';
  return '✨';
}

export function vehicleCommercialLines(car: Car): string[] {
  return [
    car.year ? `📅 Ano/Modelo: ${car.year}` : '',
    Number.isFinite(car.km) ? `🛣️ Quilometragem: ${car.km === 0 ? 'Zero km' : `${car.km.toLocaleString('pt-BR')} km`}` : '',
    car.gearbox ? `⚙️ Câmbio: ${car.gearbox}` : '',
    car.fuel ? `⛽ Combustível: ${car.fuel}` : '',
    car.color ? `🎨 Cor: ${car.color}` : '',
    ...car.features.filter(Boolean).slice(0, 12).map(feature => `${featureIcon(feature)} ${feature}`),
    `💰 Valor: ${formatVehiclePrice(car.price)}`,
  ].filter(Boolean);
}

export function vehicleShareText(car: Car, url: string): string {
  const title = [car.brand, car.model, car.version].filter(Boolean).join(' ');
  const description = car.description?.trim();
  return [
    `🚘 *${title}*`,
    vehicleCommercialLines(car).join('\n'),
    description ? `📝 ${description}` : '',
    `🔗 Veja fotos e detalhes completos:\n${url}`,
    '📲 Fale com a Dourado Veículos para consultar condições e disponibilidade.',
  ].filter(Boolean).join('\n\n');
}

export async function coverImageFile(url: string, title: string): Promise<File | undefined> {
  if (!url || typeof File === 'undefined') return undefined;
  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return undefined;
    const extension = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
    const safeTitle = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'veiculo';
    return new File([blob], `${safeTitle}.${extension}`, { type: blob.type });
  } catch {
    return undefined;
  }
}
