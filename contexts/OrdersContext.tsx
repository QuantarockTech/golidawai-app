import { useUser } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  clearOrders,
  fetchOrders,
  pushMissingOrders,
  pushOrder,
} from "@/lib/sync";

const ORDERS_KEY = "golidawayi.sentOrders";
const COUNTER_KEY = "golidawayi.orderCounter";

/** Board ids read "GD1042"; keep the shape, count up from there. */
const ORDER_ID_BASE = 1042;
const orderId = (index: number) => `GD${ORDER_ID_BASE + index}`;

/** Old records are noise, and the history is a courtesy, not an archive. */
const MAX_HISTORY = 30;

type NewSentOrder = Omit<SentOrder, "id" | "sentAt">;

type OrdersValue = {
  orders: SentOrder[];
  find: (id: string) => SentOrder | undefined;
  /**
   * Reserves the next id without recording anything.
   *
   * The id has to go into the WhatsApp message, and the message is built before
   * the customer has pressed send — so the two steps are separate.
   */
  nextId: () => string;
  /** Files an order as sent. Returns the stored record. */
  record: (order: NewSentOrder & { id: string }) => SentOrder;
  clearHistory: () => void;
  isLoaded: boolean;
};

const OrdersContext = createContext<OrdersValue | null>(null);

const isSentOrder = (value: unknown): value is SentOrder =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as SentOrder).id === "string" &&
  typeof (value as SentOrder).sentAt === "string";

/**
 * Brings an older stored order up to the current shape.
 *
 * Typed medicines used to be bare strings, before they could carry a count.
 * A record written by that version would render a blank row here, so each one
 * is read as a single unit — which is what it meant when it was written.
 */
const migrate = (order: SentOrder): SentOrder => ({
  ...order,
  typedItems: (order.typedItems ?? []).map((item) =>
    typeof item === "string" ? { name: item, quantity: 1 } : item,
  ),
  lines: order.lines ?? [],
});

/**
 * What this device has sent to the pharmacy over WhatsApp.
 *
 * Not orders in any system sense. Nothing was placed, priced or accepted here —
 * the app opens a WhatsApp draft and the pharmacy takes it from there — so
 * there are no statuses, because nothing exists that could ever update one.
 * This is the customer's own receipt of what they asked for and when, which is
 * as much as the app can honestly show.
 *
 * Kept on the phone and on the customer's account. The device copy is what the
 * screen reads — instant, and readable with no signal — and Supabase is what
 * stops the history dying with the handset.
 */
export const OrdersProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useUser();
  const userId = user?.id ?? null;

  const [orders, setOrders] = useState<SentOrder[]>([]);
  const [counter, setCounter] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      let stored: SentOrder[] = [];
      let count = 0;

      try {
        const [rawOrders, rawCounter] = await Promise.all([
          AsyncStorage.getItem(ORDERS_KEY),
          AsyncStorage.getItem(COUNTER_KEY),
        ]);

        if (rawOrders) {
          const parsed: unknown = JSON.parse(rawOrders);
          if (Array.isArray(parsed)) {
            stored = parsed.filter(isSentOrder).map(migrate);
          }
        }

        const parsedCount = Number(rawCounter);
        if (Number.isFinite(parsedCount) && parsedCount > 0) count = parsedCount;
      } catch {
        // Corrupt or unreadable history costs the customer a list, nothing more.
      }

      if (cancelled) return;

      setOrders(stored);
      setCounter(count);
      setIsLoaded(true);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Merges the account's history into this device's, once Clerk knows who is
   * signed in.
   *
   * A union rather than a replacement, keyed on the order id. A new phone has
   * nothing and takes everything; a phone that sent orders while the connection
   * was down has rows the server has never seen, and those go up rather than
   * being quietly dropped in favour of the server's view.
   *
   * The counter is pulled up to clear the highest id either side has seen, so a
   * second device carries on the sequence instead of restarting at GD1042 and
   * minting ids that already belong to other orders.
   */
  useEffect(() => {
    if (!userId || !isLoaded) return;

    let cancelled = false;

    const reconcile = async () => {
      const remote = await fetchOrders(userId, MAX_HISTORY);
      // null means the read failed. Keeping what is on the device is the only
      // safe reading of that — an empty list would look like a wiped history.
      if (cancelled || !remote) return;

      setOrders((current) => {
        const byId = new Map(current.map((order) => [order.id, order]));
        for (const order of remote) byId.set(order.id, order);

        const merged = [...byId.values()]
          .sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1))
          .slice(0, MAX_HISTORY);

        void AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(merged)).catch(
          () => {},
        );

        void pushMissingOrders(userId, current, remote);
        return merged;
      });

      setCounter((current) => {
        const highest = remote.reduce((max, order) => {
          const digits = Number(order.id.replace(/\D/g, ""));
          return Number.isFinite(digits) && digits > max ? digits : max;
        }, 0);

        const next = highest > 0 ? highest + 1 - ORDER_ID_BASE : 0;
        if (next <= current) return current;

        void AsyncStorage.setItem(COUNTER_KEY, String(next)).catch(() => {});
        return next;
      });
    };

    void reconcile();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isLoaded]);

  const find = useCallback(
    (id: string) => orders.find((order) => order.id === id),
    [orders],
  );

  /*
   * Counts up even if the customer abandons the draft. Ids are a reference for
   * a human reading WhatsApp, so a gap costs nothing — but a number reused
   * across two different orders would send the pharmacy to the wrong message.
   */
  const nextId = useCallback(() => {
    const id = orderId(counter);
    const next = counter + 1;
    setCounter(next);
    void AsyncStorage.setItem(COUNTER_KEY, String(next)).catch(() => {});
    return id;
  }, [counter]);

  const record = useCallback(
    (order: NewSentOrder & { id: string }) => {
      const stored: SentOrder = { ...order, sentAt: new Date().toISOString() };

      setOrders((current) => {
        const next = [stored, ...current].slice(0, MAX_HISTORY);
        void AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(next)).catch(
          () => {},
        );
        return next;
      });

      /*
       * Not awaited, and not gated on succeeding. The customer is already in
       * WhatsApp by the time this runs, and an order that reached the device is
       * recorded as far as they are concerned — if this write fails, the merge
       * on the next launch sends it up instead.
       */
      if (userId) void pushOrder(userId, stored);

      return stored;
    },
    [userId],
  );

  const clearHistory = useCallback(() => {
    setOrders([]);
    void AsyncStorage.removeItem(ORDERS_KEY).catch(() => {});
    // Otherwise the next launch would pull the whole history back down from the
    // account and the customer would find they had cleared nothing.
    if (userId) void clearOrders(userId);
  }, [userId]);

  const value = useMemo<OrdersValue>(
    () => ({ orders, find, nextId, record, clearHistory, isLoaded }),
    [orders, find, nextId, record, clearHistory, isLoaded],
  );

  return (
    <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
  );
};

export const useOrders = (): OrdersValue => {
  const value = useContext(OrdersContext);
  if (!value) throw new Error("useOrders must be used inside an OrdersProvider");
  return value;
};
