import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

/**
 * A prescription photo waiting to be sent.
 *
 * `uri` draws the thumbnail; `base64` is what gets uploaded. Both are kept
 * because the local file is what the customer sees, and the encoded copy is the
 * only form that uploads identically on Android, iOS and web.
 */
export type DraftPhoto = { uri: string; base64: string };

type OrderDraftContextValue = {
  typedItems: TypedItem[];
  setTypedItems: React.Dispatch<React.SetStateAction<TypedItem[]>>;
  photos: DraftPhoto[];
  setPhotos: React.Dispatch<React.SetStateAction<DraftPhoto[]>>;
  notes: string;
  setNotes: React.Dispatch<React.SetStateAction<string>>;
  /** Emptied once an order has actually left for WhatsApp. */
  clear: () => void;
};

const OrderDraftContext = createContext<OrderDraftContextValue | null>(null);

/**
 * The parts of an order that have no price.
 *
 * Medicines the catalogue doesn't stock and photographed prescriptions used to
 * live in the screen that collected them, each with its own send button. That
 * quietly split one delivery into three WhatsApp messages with three Ref
 * numbers — same name, same address, same pin — and left the pharmacy to work
 * out that they belonged together. Holding them here lets the cart send one
 * order instead.
 *
 * Deliberately not persisted. The cart survives a restart because a basket of
 * catalogue items is a convenience; a photograph of someone's prescription is a
 * health record, and leaving one in device storage to be helpful is not a
 * trade worth making.
 */
export function OrderDraftProvider({ children }: React.PropsWithChildren) {
  const [typedItems, setTypedItems] = useState<TypedItem[]>([]);
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [notes, setNotes] = useState("");

  const clear = useCallback(() => {
    setTypedItems([]);
    setPhotos([]);
    setNotes("");
  }, []);

  const value = useMemo<OrderDraftContextValue>(
    () => ({
      typedItems,
      setTypedItems,
      photos,
      setPhotos,
      notes,
      setNotes,
      clear,
    }),
    [typedItems, photos, notes, clear],
  );

  return (
    <OrderDraftContext.Provider value={value}>
      {children}
    </OrderDraftContext.Provider>
  );
}

export function useOrderDraft(): OrderDraftContextValue {
  const context = useContext(OrderDraftContext);

  if (!context) {
    throw new Error("useOrderDraft must be used inside an OrderDraftProvider");
  }

  return context;
}
