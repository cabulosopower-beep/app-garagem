import { useState, useEffect } from 'react';
import { getSignedUrl } from './upload';

export function useSignedUrl(path: string | null): { url: string | null; loading: boolean } {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }
    if (path.startsWith('http')) {
      setUrl(path);
      return;
    }
    setLoading(true);
    let active = true;
    (async () => {
      const signed = await getSignedUrl(path);
      if (active) {
        setUrl(signed);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [path]);

  return { url, loading };
}
