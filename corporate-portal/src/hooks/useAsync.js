import { useCallback, useEffect, useRef, useState } from 'react';

/** Runs an async loader on mount / when deps change, ignoring stale responses. */
export function useAsync(loader, deps = []) {
  const [data, setDataState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  const callId = useRef(0);

  useEffect(() => {
    const id = ++callId.current;
    setLoading(true);
    setError(null);
    loader()
      .then((res) => {
        if (id === callId.current) setDataState(res);
      })
      .catch((err) => {
        if (id === callId.current) setError(err instanceof Error ? err.message : 'Something went wrong.');
      })
      .finally(() => {
        if (id === callId.current) setLoading(false);
      });
    // `loader` is recreated every render; `deps` decides when to refetch.
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((updater) => {
    setDataState((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  return { data, loading, error, reload, setData };
}
