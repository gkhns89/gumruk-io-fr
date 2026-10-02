import { useEffect, useState } from 'react';
import { resolveMapStyleUrl } from '../utils/mapStyle';

/**
 * Haritanın kullanacağı stil adresi (bkz. utils/mapStyle.js). Yoklama bitene kadar `null` döner;
 * harita bileşenleri o sırada haritayı kurmaz, stil gelince efekt yeniden çalışır.
 *
 * Yoklama oturumda bir kez yapıldığı için ikinci haritada bekleme olmaz.
 */
export function useMapStyle() {
  const [styleUrl, setStyleUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    resolveMapStyleUrl().then((url) => {
      if (!cancelled) setStyleUrl(url);
    });
    return () => { cancelled = true; };
  }, []);

  return styleUrl;
}

export default useMapStyle;
