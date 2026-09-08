import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  /**
   * Reads the sheet again, but only if the copy in hand is old enough to be
   * worth replacing. Safe to call on every screen focus.
   */
  refreshIfStale: () => void;
};

/**
 * How old the catalogue must be before a screen focus goes back to the sheet.
 *
 * Google republishes on roughly a five-minute delay, so asking again sooner
 * than that cannot return anything newer — it would only spend a customer's
 * data to be told the same thing.
 */
const REFRESH_AFTER_MS = 5 * 60 * 1000;

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
 *
 * Fetching once at startup was not enough: an app left open outlives the edits
 * the pharmacy makes during the day, so screens call `refreshIfStale` when they
 * come into focus and the catalogue is re-read whenever it has gone cold.
 */
export function CatalogueProvider({ children }: React.PropsWithChildren) {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [isStale, setIsStale] = useState(false);

  /** Bumped by `refresh` to re-run the effect below. */
  const [attempt, setAttempt] = useState(0);

  /**
   * When the sheet last answered, so `refreshIfStale` can tell a catalogue
   * worth replacing from one fetched moments ago. Starts at mount rather than
   * at zero because the first fetch is already on its way by then, and a focus
   * arriving while it is still in flight should wait for it, not race it.
   */
  const lastLoadedAt = useRef(Date.now());

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
        lastLoadedAt.current = Date.now();
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

  const refreshIfStale = useCallback(() => {
    if (Date.now() - lastLoadedAt.current < REFRESH_AFTER_MS) return;
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo<CatalogueValue>(
    () => ({
      medicines,
      categories: categoriesOf(medicines),
      isLoading,
      failed,
      isStale,
      refresh,
      refreshIfStale,
    }),
    [medicines, isLoading, failed, isStale, refresh, refreshIfStale],
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
