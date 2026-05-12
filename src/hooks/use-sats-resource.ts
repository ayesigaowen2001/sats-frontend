"use client";

import { useEffect } from "react";

export function useSatsResource<T>(
  resource: T | undefined,
  isLoading: boolean | undefined,
  load: () => Promise<void>,
) {
  useEffect(() => {
    if (!resource && !isLoading) {
      void load();
    }
  }, [isLoading, load, resource]);
}
