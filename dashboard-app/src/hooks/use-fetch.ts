"use client";

import * as React from "react";

interface UsePollingOptions<T> {
  enabled?: boolean;
  initialData?: T;
}

/**
 * Polls an async fetcher on an interval. Returns data, error, loading and a refetch function.
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  options: UsePollingOptions<T> = {},
) {
  const { enabled = true, initialData } = options;
  const [data, setData] = React.useState<T | undefined>(initialData);
  const [error, setError] = React.useState<Error | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const mountedRef = React.useRef(true);
  const fetcherRef = React.useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = React.useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      if (!mountedRef.current) return;
      setData(result);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err as Error);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    mountedRef.current = true;
    if (!enabled) {
      setLoading(false);
      return;
    }
    refetch();
    const id = setInterval(refetch, intervalMs);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [enabled, intervalMs, refetch]);

  return { data, error, loading, refetch };
}

/**
 * Simple fetch hook with manual refetch
 */
export function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
) {
  const [data, setData] = React.useState<T | undefined>(undefined);
  const [error, setError] = React.useState<Error | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const mountedRef = React.useRef(true);
  const fetcherRef = React.useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetcherRef.current();
      if (!mountedRef.current) return;
      setData(result);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err as Error);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  React.useEffect(() => {
    mountedRef.current = true;
    refetch();
    return () => {
      mountedRef.current = false;
    };
  }, [refetch]);

  return { data, error, loading, refetch, setData };
}
