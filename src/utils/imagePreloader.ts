const decodedImages = new Set<string>();
const pendingImages = new Map<string, Promise<void>>();

export function isImageDecoded(url: string) {
  return decodedImages.has(url);
}

export function preloadImage(url: string, priority: 'high' | 'low' | 'auto' = 'auto'): Promise<void> {
  if (!url || decodedImages.has(url)) return Promise.resolve();
  const pending = pendingImages.get(url);
  if (pending) return pending;

  const request = new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.fetchPriority = priority;
    image.onload = async () => {
      try { await image.decode?.(); } catch { /* onload is enough for older browsers */ }
      decodedImages.add(url);
      pendingImages.delete(url);
      resolve();
    };
    image.onerror = () => {
      pendingImages.delete(url);
      reject(new Error(`Não foi possível carregar o frame: ${url}`));
    };
    image.src = url;
  });

  pendingImages.set(url, request);
  return request;
}

export async function preloadFrameSequence(urls: string[], centerIndex = 0, radius = 3) {
  if (!urls.length) return;
  const indexes = [centerIndex];
  for (let distance = 1; distance <= Math.min(radius, urls.length - 1); distance += 1) {
    indexes.push(
      (centerIndex + distance) % urls.length,
      (centerIndex - distance + urls.length) % urls.length,
    );
  }
  const uniqueIndexes = indexes.filter((index, position, list) => list.indexOf(index) === position);
  await Promise.all(uniqueIndexes.map((index, order) => preloadImage(urls[index], order < 3 ? 'high' : 'low').catch(() => undefined)));
}
