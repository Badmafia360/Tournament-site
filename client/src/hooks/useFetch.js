import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

export function useFetch(path, { deps = [], refreshMs = 0 } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    let alive = true;
    if (!path) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading((current) => (data == null ? true : current));
    setError(null);

    api
      .get(path)
      .then((payload) => {
        if (alive) {
          setData(payload);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (alive) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, ...deps]);

  useEffect(() => {
    if (!refreshMs || !path) return undefined;
    const id = setInterval(refresh, refreshMs);
    return () => clearInterval(id);
  }, [refreshMs, path, refresh]);

  return { data, loading, error, refresh, setData };
}
