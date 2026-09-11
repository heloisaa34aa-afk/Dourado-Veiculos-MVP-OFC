import type { BannerImageSize } from './bannerFormats';

interface LoadedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}

export function calculateContainSize(width: number, height: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function calculateCoverCrop(width: number, height: number, targetWidth: number, targetHeight: number) {
  const sourceRatio = width / height;
  const targetRatio = targetWidth / targetHeight;
  if (sourceRatio > targetRatio) {
    const cropWidth = height * targetRatio;
    return { x: (width - cropWidth) / 2, y: 0, width: cropWidth, height };
  }
  const cropHeight = width / targetRatio;
  return { x: 0, y: (height - cropHeight) / 2, width, height: cropHeight };
}

async function loadImage(file: File): Promise<LoadedImage> {
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Não foi possível abrir a imagem.')); });
  return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(url) };
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Não foi possível otimizar a imagem.')), type, quality));
}

export async function optimizeBannerImage(file: File, size: BannerImageSize) {
  const loaded = await loadImage(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('O navegador não disponibilizou o processamento de imagem.');
    const crop = calculateCoverCrop(loaded.width, loaded.height, size.width, size.height);
    context.drawImage(loaded.source, crop.x, crop.y, crop.width, crop.height, 0, 0, size.width, size.height);
    const blob = await canvasBlob(canvas, 'image/webp', 0.84);
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'banner'}.webp`, { type: 'image/webp' });
  } finally { loaded.close(); }
}

export async function optimizeVehicle360Frame(file: File) {
  if (file.type === 'image/webp' && file.size <= 550_000) return file;
  const loaded = await loadImage(file);
  try {
    const size = calculateContainSize(loaded.width, loaded.height, 1400, 1050);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('O navegador não disponibilizou o processamento de imagem.');
    context.drawImage(loaded.source, 0, 0, size.width, size.height);
    const blob = await canvasBlob(canvas, 'image/webp', 0.72);
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'frame'}.webp`, { type: 'image/webp' });
  } finally { loaded.close(); }
}

export async function optimizeVehicleMediaImage(file: File) {
  if (file.type === 'image/webp' && file.size <= 750_000) return file;
  const loaded = await loadImage(file);
  try {
    const size = calculateContainSize(loaded.width, loaded.height, 1800, 1350);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('O navegador não disponibilizou o processamento de imagem.');
    context.drawImage(loaded.source, 0, 0, size.width, size.height);
    const blob = await canvasBlob(canvas, 'image/webp', 0.82);
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'veiculo'}.webp`, { type: 'image/webp' });
  } finally { loaded.close(); }
}
