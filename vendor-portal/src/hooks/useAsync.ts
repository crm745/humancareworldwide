import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setData: (updater: T | ((prev: T | null) => T)) => void;
}

/** Runs an async loader on mount / when deps change, ignoring stale responses. */
export function useAsync<T>(loader: () => Promise<T>, deps: DependencyList = []): AsyncState<T> {
  const [data, setDataState] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      .catch((err: unknown) => {
        if (id === callId.current) setError(err instanceof Error ? err.message : 'Something went wrong.');
      })
      .finally(() => {
        if (id === callId.current) setLoading(false);
      });
    // `loader` is recreated every render; `deps` decides when to refetch.
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((updater: T | ((prev: T | null) => T)) => {
    setDataState((prev) => (typeof updater === 'function' ? (updater as (p: T | null) => T)(prev) : updater));
  }, []);

  return { data, loading, error, reload, setData };
}
