import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** The board's flat ₹20 delivery charge. */
export const DELIVERY_FEE = 20;

type OrdersValue = {
  orders: Order[];
  find: (id: string) => Order | undefined;
  /** Returns the new order so the caller can navigate straight to it. */
  place: (lines: OrderLine[], needsPharmacistReview: boolean) => Order;
  advance: (id: string) => void;
};

const OrdersContext = createContext<OrdersValue | null>(null);

const STATUS_SEQUENCE: OrderStatus[] = [
  "placed",
  "verified",
  "packed",
  "outForDelivery",
];

/** Board ids read "GD1042"; keep the shape, count up from there. */
const orderId = (index: number) => `GD${1042 + index}`;

/**
 * Orders placed in this session.
 *
 * In-memory like the cart, and for the same reason: there is no orders backend,
 * so an order that survived a restart could never actually be fulfilled or
 * updated. `advance` stands in for the status pushes a real backend would send.
 */
export const OrdersProvider = ({ children }: { children: ReactNode }) => {
  const [orders, setOrders] = useState<Order[]>([]);

  const find = useCallback(
    (id: string) => orders.find((order) => order.id === id),
    [orders],
  );

  const place = useCallback(
    (lines: OrderLine[], needsPharmacistReview: boolean) => {
      const goods = lines.reduce((sum, line) => sum + line.price, 0);
      const order: Order = {
        id: orderId(orders.length),
        placedAt: new Date().toISOString(),
        status: "placed",
        lines,
        deliveryFee: DELIVERY_FEE,
        total: goods + DELIVERY_FEE,
        needsPharmacistReview,
      };
      setOrders((current) => [order, ...current]);
      return order;
    },
    [orders.length],
  );

  const advance = useCallback((id: string) => {
    setOrders((current) =>
      current.map((order) => {
        if (order.id !== id) return order;
        const next = STATUS_SEQUENCE.indexOf(order.status) + 1;
        return next < STATUS_SEQUENCE.length
          ? { ...order, status: STATUS_SEQUENCE[next] }
          : order;
      }),
    );
  }, []);

  const value = useMemo<OrdersValue>(
    () => ({ orders, find, place, advance }),
    [advance, find, orders, place],
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

export { STATUS_SEQUENCE };
