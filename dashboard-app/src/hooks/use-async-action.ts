"use client";

import * as React from "react";
import { toast } from "sonner";

export function useAsyncAction() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const run = React.useCallback(
    async <T,>(fn: () => Promise<T>, opts?: {
      successMessage?: string;
      errorMessage?: string;
      onSuccess?: (data: T) => void;
      onError?: (err: Error) => void;
    }): Promise<T | undefined> => {
      setLoading(true);
      setError(null);
      try {
        const data = await fn();
        if (opts?.successMessage) toast.success(opts.successMessage);
        opts?.onSuccess?.(data);
        return data;
      } catch (err) {
        const e = err as Error;
        const msg = opts?.errorMessage ?? e.message ?? "حدث خطأ";
        setError(msg);
        toast.error(msg);
        opts?.onError?.(e);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { loading, error, run };
}
