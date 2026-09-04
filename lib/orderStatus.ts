import type { TranslationKey } from "@/lib/i18n/translations";

/**
 * Shared by the orders list, the order detail stepper and anything else that
 * shows status, so the four steps can never drift apart between screens.
 */
export const STATUS_LABEL_KEYS: Record<OrderStatus, TranslationKey> = {
  placed: "order.status.placed",
  verified: "order.status.verified",
  packed: "order.status.packed",
  outForDelivery: "order.status.outForDelivery",
};
