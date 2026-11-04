"use client";

import { useEffect, useState } from "react";

/** The value once it has stopped changing for `delay` ms, so typing does not fire a request per key. */
export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}
