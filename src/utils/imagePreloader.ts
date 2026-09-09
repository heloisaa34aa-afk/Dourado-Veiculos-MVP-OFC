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

export async function preloadFrameSequence(urls: string[], firstIndex = 0) {
  if (!urls.length) return;
  const order: number[] = [firstIndex];
  for (let distance = 1; distance < urls.length; distance += 1) {
    order.push((firstIndex + distance) % urls.length, (firstIndex - distance + urls.length) % urls.length);
  }
  const uniqueOrder = order.filter((index, position, list) => list.indexOf(index) === position);

  await Promise.all(uniqueOrder.slice(0, 5).map(index => preloadImage(urls[index], 'high').catch(() => undefined)));

  const loadRemaining = () => {
    let cursor = 5;
    const next = () => {
      if (cursor >= uniqueOrder.length) return;
      const batch = uniqueOrder.slice(cursor, cursor + 3);
      cursor += batch.length;
      void Promise.all(batch.map(index => preloadImage(urls[index], 'low').catch(() => undefined)))
        .finally(() => window.setTimeout(next, 16));
    };
    next();
  };

  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (callback: () => void) => number }).requestIdleCallback(loadRemaining);
  } else {
    globalThis.setTimeout(loadRemaining, 50);
  }
}
