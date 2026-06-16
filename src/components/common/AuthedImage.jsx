import React, { useEffect, useState } from 'react';
import { fetchAuthedImageObjectUrl } from '../../utils/imageUtils';

/**
 * Auth gerektiren bir resim endpoint'ini (örn. "/users/5/avatar") <img> ile gösterir.
 * URL'yi blob olarak çeker, objectURL üretir ve unmount'ta serbest bırakır.
 * `url` boşsa veya yükleme başarısızsa `fallback` render edilir (yoksa hiçbir şey).
 *
 * Props:
 *  - url: relative API yolu (axios baseURL'e göre), null/undefined olabilir
 *  - alt, className, imgClassName: standart görünüm props'ları
 *  - fallback: url yokken/yüklenemezken gösterilecek React node
 */
export default function AuthedImage({ url, alt = '', className = '', imgClassName = '', fallback = null }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let created = null;

    setFailed(false);
    setObjectUrl(null);

    if (!url) return undefined;

    fetchAuthedImageObjectUrl(url).then((result) => {
      if (!active) {
        if (result) URL.revokeObjectURL(result);
        return;
      }
      if (result) {
        created = result;
        setObjectUrl(result);
      } else {
        setFailed(true);
      }
    });

    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [url]);

  if (!url || failed || !objectUrl) {
    return fallback;
  }

  return (
    <img
      src={objectUrl}
      alt={alt}
      className={`${className} ${imgClassName}`.trim()}
    />
  );
}
