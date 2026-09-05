import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "golidawayi.orderPrefs";

type OrderPrefsContextValue = {
  prefs: OrderPrefs;
  setSubstitution: (allowed: boolean) => void;
  setPayment: (method: PaymentMethod) => void;
  setUrgent: (urgent: boolean) => void;
  /** Called after an order is sent — urgency belongs to that order, not the next. */
  clearUrgent: () => void;
};

const DEFAULTS: OrderPrefs = {
  /*
   * Off by default, and deliberately so. Agreeing to a substitute is the
   * customer's decision to make, not one to inherit from a default they never
   * read — and a pharmacist reading "brand as written" is never worse off than
   * one who guessed.
   */
  allowSubstitution: false,
  payment: "cash",
  urgent: false,
};

const OrderPrefsContext = createContext<OrderPrefsContextValue | null>(null);

const isPrefs = (value: unknown): value is Partial<OrderPrefs> =>
  typeof value === "object" && value !== null;

/**
 * How the customer wants this order handled.
 *
 * Three questions the pharmacy would otherwise have to ring up and ask:
 * whether a generic will do, how it gets paid for, and whether it is urgent.
 * Answering them in the message is the difference between an order that can be
 * packed straight away and one that waits for someone to pick up the phone.
 *
 * The first two persist, because they are the sort of preference a customer
 * holds rather than reconsiders. Urgency does not: "need it now" describes one
 * fever at ten at night, and carrying it into next month's refill would tell
 * the pharmacy something untrue.
 */
export function OrderPrefsProvider({ children }: React.PropsWithChildren) {
  const [prefs, setPrefs] = useState<OrderPrefs>(DEFAULTS);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        const parsed: unknown = JSON.parse(raw);
        if (cancelled || !isPrefs(parsed)) return;

        setPrefs((current) => ({
          ...current,
          ...(typeof parsed.allowSubstitution === "boolean"
            ? { allowSubstitution: parsed.allowSubstitution }
            : {}),
          ...(parsed.payment === "cash" || parsed.payment === "upi"
            ? { payment: parsed.payment }
            : {}),
          // urgent is intentionally not restored.
        }));
      } catch {
        // Unreadable or corrupt: the defaults are safe to fall back on.
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: OrderPrefs) => {
    setPrefs(next);
    void AsyncStorage.setItem(
      STORAGE_KEY,
      // Only the durable half is written, so a stale "urgent" cannot come back
      // from storage on the next launch.
      JSON.stringify({
        allowSubstitution: next.allowSubstitution,
        payment: next.payment,
      }),
    ).catch(() => {});
  }, []);

  const setSubstitution = useCallback(
    (allowed: boolean) =>
      setPrefs((current) => {
        const next = { ...current, allowSubstitution: allowed };
        persist(next);
        return next;
      }),
    [persist],
  );

  const setPayment = useCallback(
    (method: PaymentMethod) =>
      setPrefs((current) => {
        const next = { ...current, payment: method };
        persist(next);
        return next;
      }),
    [persist],
  );

  const setUrgent = useCallback(
    (urgent: boolean) => setPrefs((current) => ({ ...current, urgent })),
    [],
  );

  const clearUrgent = useCallback(
    () => setPrefs((current) => ({ ...current, urgent: false })),
    [],
  );

  const value = useMemo<OrderPrefsContextValue>(
    () => ({ prefs, setSubstitution, setPayment, setUrgent, clearUrgent }),
    [prefs, setSubstitution, setPayment, setUrgent, clearUrgent],
  );

  return (
    <OrderPrefsContext.Provider value={value}>
      {children}
    </OrderPrefsContext.Provider>
  );
}

export function useOrderPrefs(): OrderPrefsContextValue {
  const context = useContext(OrderPrefsContext);

  if (!context) {
    throw new Error("useOrderPrefs must be used inside an OrderPrefsProvider");
  }

  return context;
}
