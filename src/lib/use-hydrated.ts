import { useEffect, useState } from "react";

/** Returns true only after the client has hydrated, avoiding SSR/client mismatches. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
