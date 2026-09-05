import type { TranslationKey } from "@/lib/i18n/translations";

/**
 * Shared by the sent-orders list and the detail screen, so the label for a kind
 * of order can never drift between the two.
 */
export const KIND_LABELS: Record<OrderKind, TranslationKey> = {
  cart: "orders.kind.cart",
  typedList: "orders.kind.typedList",
  prescription: "orders.kind.prescription",
  mixed: "orders.kind.mixed",
};

/**
 * Names an order after what is actually in it.
 *
 * The kind used to be whichever screen the send button lived on, which stopped
 * meaning anything once one basket could hold all three. Two or more sorts of
 * thing in the same order is "mixed" — the pharmacy reads that as "there is
 * more than one list below, do not stop at the first".
 */
export const orderKindOf = (contents: {
  lines: number;
  typedItems: number;
  prescriptions: number;
}): OrderKind => {
  const present = [
    contents.lines > 0,
    contents.typedItems > 0,
    contents.prescriptions > 0,
  ].filter(Boolean).length;

  if (present > 1) return "mixed";
  if (contents.prescriptions > 0) return "prescription";
  if (contents.typedItems > 0) return "typedList";
  return "cart";
};
