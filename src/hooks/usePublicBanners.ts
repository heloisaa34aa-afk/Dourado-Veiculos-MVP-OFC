import { useEffect, useState } from 'react';
import { bannerService, SiteBanner } from '../services/banner.service';

const BANNER_CACHE_KEY = 'dourado:public-banners:v1';

function readCachedBanners(): SiteBanner[] {
  try {
    const cached = localStorage.getItem(BANNER_CACHE_KEY);
    if (!cached) return [];
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed?.data) ? parsed.data : [];
  } catch {
    return [];
  }
}

export function usePublicBanners() {
  const [banners, setBanners] = useState<SiteBanner[]>(readCachedBanners);
  const [loading, setLoading] = useState(() => readCachedBanners().length === 0);

  useEffect(() => {
    let active = true;
    bannerService.listPublic()
      .then(data => {
        if (!active) return;
        setBanners(data);
        try { localStorage.setItem(BANNER_CACHE_KEY, JSON.stringify({ data, savedAt: Date.now() })); } catch { /* optional cache */ }
      })
      .catch(error => console.warn('[banners] Não foi possível carregar:', error))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { banners, loading };
}
