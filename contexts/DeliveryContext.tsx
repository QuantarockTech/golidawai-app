import { useUser } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { deleteAddress, fetchAddress, pushAddress } from "@/lib/sync";

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
 * The one delivery address, on this device and on the customer's account.
 *
 * Device first, server second, and in that order deliberately. The copy on the
 * phone is what the screen reads, so an address appears the instant the app
 * opens and works with no signal at all; Supabase is what makes it survive a
 * new phone, a reinstall, or signing in on a laptop — the gap that made someone
 * retype their address on every device they owned.
 *
 * A failed sync is never allowed to matter. A read that fails leaves the local
 * copy on screen, and a write that fails leaves the device holding the record
 * until the next save. Losing an address to a dropped connection would be worse
 * than briefly showing an old one.
 */
export function DeliveryProvider({ children }: React.PropsWithChildren) {
  const { user } = useUser();
  const userId = user?.id ?? null;

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

  /*
   * Reconciles with the account once Clerk knows who is signed in.
   *
   * Newest wins, by `savedAt`. That is the right rule for one address edited on
   * whichever phone the customer had to hand: a laptop holding last month's
   * address should take this morning's from the server, and a phone that just
   * saved one should send it up rather than have it overwritten.
   *
   * A device with an address and an account with none is the migration path for
   * everyone who used the app before any of this existed — their address goes
   * up on the first launch after signing in, and they never notice.
   */
  useEffect(() => {
    if (!userId || !isLoaded) return;

    let cancelled = false;

    const reconcile = async () => {
      const remote = await fetchAddress(userId);
      if (cancelled) return;

      if (!remote) {
        if (address) void pushAddress(userId, address);
        return;
      }

      if (!address || remote.savedAt > address.savedAt) {
        setAddress(remote);
        void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remote)).catch(
          () => {},
        );
        return;
      }

      if (address.savedAt > remote.savedAt) void pushAddress(userId, address);
    };

    void reconcile();

    return () => {
      cancelled = true;
    };
    // Runs when the customer is known, not on every edit — `save` already sends
    // its own writes up, and depending on `address` would re-fetch after each.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isLoaded]);

  const save = useCallback(
    (next: DeliveryAddress) => {
      setAddress(next);
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(
        () => {},
      );
      // Not awaited: the screen closes on save, and an address that reached the
      // device has been saved as far as the customer is concerned.
      if (userId) void pushAddress(userId, next);
    },
    [userId],
  );

  const clear = useCallback(() => {
    setAddress(null);
    void AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    if (userId) void deleteAddress(userId);
  }, [userId]);

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
