"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Persisted client state hook backed by localStorage. Used for the credits
 * balance and the local search history. History and credits live only in the
 * user's browser — the server keeps no per-user records for the MVP.
 */
export function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* storage full / unavailable */
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, update, hydrated] as const;
}
