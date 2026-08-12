import { afterEach, describe, expect, it, vi } from 'vitest';

describe('imagePreloader', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('decodifica uma URL uma vez e reutiliza o carregamento pendente', async () => {
    const instances: Array<{ onload?: () => void; onerror?: () => void; decode: ReturnType<typeof vi.fn> }> = [];
    class ImageMock {
      decoding = '';
      onload?: () => void;
      onerror?: () => void;
      decode = vi.fn().mockResolvedValue(undefined);
      set src(_value: string) { instances.push(this); }
    }
    vi.stubGlobal('Image', ImageMock);

    const { preloadImage, isImageDecoded } = await import('./imagePreloader');
    const url = `https://cdn.example/frame-${crypto.randomUUID()}.jpg`;
    const first = preloadImage(url);
    const duplicate = preloadImage(url);

    expect(instances).toHaveLength(1);
    instances[0].onload?.();
    await expect(Promise.all([first, duplicate])).resolves.toEqual([undefined, undefined]);
    expect(instances[0].decode).toHaveBeenCalledOnce();
    expect(isImageDecoded(url)).toBe(true);
  });
});
