import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type CartLine = {
  item: ReorderItem;
  quantity: number;
};

type CartValue = {
  lines: CartLine[];
  /** Quantity of one item, or 0 when it isn't in the cart. */
  quantityOf: (id: string) => number;
  add: (item: ReorderItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  itemCount: number;
  total: number;
  /** True when any line needs a prescription, which gates checkout messaging. */
  needsPharmacistReview: boolean;
};

const CartContext = createContext<CartValue | null>(null);

/**
 * In-memory basket for the dashboard's reorder list.
 *
 * Deliberately not persisted: there is no orders backend yet, and a basket that
 * survives a restart but can never be checked out is a worse lie than one that
 * clears. Swap the useState for storage once checkout exists.
 */
export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [lines, setLines] = useState<CartLine[]>([]);

  const quantityOf = useCallback(
    (id: string) => lines.find((line) => line.item.id === id)?.quantity ?? 0,
    [lines],
  );

  const add = useCallback((item: ReorderItem) => {
    setLines((current) => {
      const existing = current.find((line) => line.item.id === item.id);
      if (!existing) return [...current, { item, quantity: 1 }];

      return current.map((line) =>
        line.item.id === item.id
          ? { ...line, quantity: line.quantity + 1 }
          : line,
      );
    });
  }, []);

  const remove = useCallback((id: string) => {
    setLines((current) =>
      current.flatMap((line) => {
        if (line.item.id !== id) return [line];
        return line.quantity > 1
          ? [{ ...line, quantity: line.quantity - 1 }]
          : [];
      }),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartValue>(() => {
    const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
    const total = lines.reduce(
      (sum, line) => sum + line.item.price * line.quantity,
      0,
    );
    const needsPharmacistReview = lines.some(
      (line) => "rxRequired" in line.item && line.item.rxRequired,
    );
    return {
      lines,
      quantityOf,
      add,
      remove,
      clear,
      itemCount,
      total,
      needsPharmacistReview,
    };
  }, [add, clear, lines, quantityOf, remove]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartValue => {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside a CartProvider");
  return value;
};
