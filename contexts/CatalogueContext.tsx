import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  categoriesOf,
  fetchCatalogue,
  readCachedCatalogue,
} from "@/lib/catalogue";

type CatalogueValue = {
  medicines: Medicine[];
  /** The categories the sheet actually uses, empty until that column exists. */
  categories: string[];
  /** True only while there is nothing to show yet — never over a refresh. */
  isLoading: boolean;
  /** Set when the network failed and no cache could stand in for it. */
  failed: boolean;
  /** Whether what is on screen came from disk rather than the network. */
  isStale: boolean;
  refresh: () => void;
};

const CatalogueContext = createContext<CatalogueValue | null>(null);

/**
 * The medicine catalogue, cache first and network second.
 *
 * Reads the last good copy off the device and shows it immediately, then goes
 * to the sheet and replaces it. That ordering is the whole point: the customer
 * opening the app on a patchy connection outside a pharmacy sees the catalogue
 * straight away, and a network round trip never stands between them and the
 * list. A failed refresh leaves the cached copy alone rather than emptying the
 * screen — a stale price is worth more than no medicines.
 */
export function CatalogueProvider({ children }: React.PropsWithChildren) {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [isStale, setIsStale] = useState(false);

  /** Bumped by `refresh` to re-run the effect below. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setFailed(false);

      // Only worth reading on the first pass. On a manual refresh the cache is
      // whatever is already on screen, so re-reading it would show nothing new.
      if (attempt === 0) {
        const cached = await readCachedCatalogue();
        if (cancelled) return;

        if (cached) {
          setMedicines(cached);
          setIsStale(true);
          setIsLoading(false);
        }
      }

      try {
        const fresh = await fetchCatalogue();
        if (cancelled) return;

        setMedicines(fresh);
        setIsStale(false);
      } catch {
        if (cancelled) return;
        // Only a failure worth reporting if there is nothing else to show.
        setFailed((current) => current || medicines.length === 0);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
    // `medicines` is deliberately not a dependency: it is read inside the catch
    // only to decide whether a failure is visible, and depending on it would
    // restart the fetch every time the catalogue loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const refresh = useCallback(() => setAttempt((n) => n + 1), []);

  const value = useMemo<CatalogueValue>(
    () => ({
      medicines,
      categories: categoriesOf(medicines),
      isLoading,
      failed,
      isStale,
      refresh,
    }),
    [medicines, isLoading, failed, isStale, refresh],
  );

  return (
    <CatalogueContext.Provider value={value}>
      {children}
    </CatalogueContext.Provider>
  );
}

export function useCatalogue(): CatalogueValue {
  const context = useContext(CatalogueContext);

  if (!context) {
    throw new Error("useCatalogue must be used inside a CatalogueProvider");
  }

  return context;
}
