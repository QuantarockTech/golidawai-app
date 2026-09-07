import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "golidawayi.deliveryAddress";

type DeliveryContextValue = {
  address: DeliveryAddress | null;
  save: (address: DeliveryAddress) => void;
  clear: () => void;
  /** False until storage has been read, so no screen flashes "no address". */
  isLoaded: boolean;
};

const DeliveryContext = createContext<DeliveryContextValue | null>(null);

/**
 * What an earlier build wrote for a pin the customer dragged onto a map.
 *
 * That map is gone — Google's embed cannot be read back out of, so nothing is
 * placed by hand any more. The coordinates it saved are still good, so a stored
 * address carrying it is read as the closest thing that remains: a point the
 * customer chose rather than one a radio guessed.
 */
const LEGACY_PLACED = "map";

const isAddress = (value: unknown): value is DeliveryAddress => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<DeliveryAddress>;
  return (
    typeof candidate.text === "string" &&
    (candidate.source === "gps" ||
      candidate.source === "manual" ||
      candidate.source === "search" ||
      (candidate.source as string | undefined) === LEGACY_PLACED)
  );
};

/**
 * Brings an address saved before the fields were split up to date.
 *
 * Two changes have happened to this record. `source: "map"` named a pin the
 * customer dragged, and there is no dragging any more. And the address itself
 * used to be one free-text box, which is now `area` for what the app resolved
 * and `flat`/`landmark` for what only the customer knows.
 *
 * The old box goes to whichever field it actually came from: a `manual` address
 * was typed by hand, so it becomes the flat line; anything else was written by
 * the geocoder, so it becomes the area. Guessing either way would be wrong for
 * the other, and dropping it would lose the only address the customer has.
 */
const migrate = (address: DeliveryAddress): DeliveryAddress => {
  const source =
    (address.source as string) === LEGACY_PLACED ? "search" : address.source;

  // Already split — nothing to move.
  if (address.area || address.flat || address.landmark) {
    return { ...address, source };
  }

  const text = address.text?.trim();
  if (!text) return { ...address, source };

  return {
    ...address,
    source,
    ...(address.source === "manual" ? { flat: text } : { area: text }),
  };
};

/**
 * The one delivery address, kept on this device and nowhere else.
 *
 * Deliberately local: the client asked that no customer data be stored off the
 * phone, so this is a convenience for the customer — type it once, not at every
 * order — rather than a record anyone else can read. It reaches the pharmacy
 * only inside a WhatsApp message the customer presses send on.
 */
export function DeliveryProvider({ children }: React.PropsWithChildren) {
  const [address, setAddress] = useState<DeliveryAddress | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      let stored: DeliveryAddress | null = null;

      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (isAddress(parsed)) stored = migrate(parsed);
        }
      } catch {
        // Unreadable or corrupt: start empty rather than block the screen.
      }

      if (cancelled) return;

      setAddress(stored);
      setIsLoaded(true);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback((next: DeliveryAddress) => {
    setAddress(next);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const clear = useCallback(() => {
    setAddress(null);
    void AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const value = useMemo<DeliveryContextValue>(
    () => ({ address, save, clear, isLoaded }),
    [address, save, clear, isLoaded],
  );

  return (
    <DeliveryContext.Provider value={value}>{children}</DeliveryContext.Provider>
  );
}

export function useDelivery(): DeliveryContextValue {
  const context = useContext(DeliveryContext);

  if (!context) {
    throw new Error("useDelivery must be used inside a DeliveryProvider");
  }

  return context;
}

/** One readable line for the WhatsApp message and the sent-order history. */
export const describeAddress = (address: DeliveryAddress | null): string => {
  if (!address) return "";
  if (address.text) return address.text;
  if (address.latitude != null && address.longitude != null) {
    return `${address.latitude.toFixed(5)}, ${address.longitude.toFixed(5)}`;
  }
  return "";
};
