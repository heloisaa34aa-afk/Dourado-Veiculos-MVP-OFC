const decodedImages = new Set<string>();
const pendingImages = new Map<string, Promise<void>>();

export function isImageDecoded(url: string) {
  return decodedImages.has(url);
}

export function preloadImage(url: string): Promise<void> {
  if (!url || decodedImages.has(url)) return Promise.resolve();
  const pending = pendingImages.get(url);
  if (pending) return pending;

  const request = new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
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
  const order = [
    firstIndex,
    (firstIndex + 1) % urls.length,
    (firstIndex - 1 + urls.length) % urls.length,
    ...urls.map((_, index) => index),
  ].filter((index, position, list) => list.indexOf(index) === position);

  await Promise.all(order.slice(0, 3).map(index => preloadImage(urls[index]).catch(() => undefined)));

  const loadRemaining = () => {
    let cursor = 3;
    const next = () => {
      if (cursor >= order.length) return;
      void preloadImage(urls[order[cursor++]])
        .catch(() => undefined)
        .finally(() => window.setTimeout(next, 0));
    };
    next();
  };

  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (callback: () => void) => number }).requestIdleCallback(loadRemaining);
  } else {
    globalThis.setTimeout(loadRemaining, 50);
  }
}
