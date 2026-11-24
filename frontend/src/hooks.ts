import { useEffect, useState } from 'react';
import { api } from './api';

/** GET helper with loading/error/reload. Pass path=null to skip. `key` re-fetches when it changes. */
export function useFetch<T>(path: string | null, key: unknown = null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (path === null) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api<T>(path)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setLoading(false);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, key, tick]);

  return { data, error, loading, reload: () => setTick((t) => t + 1) };
}
