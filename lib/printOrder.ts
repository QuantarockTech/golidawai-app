import * as Print from "expo-print";

import { orderSheetHtml } from "@/lib/orderSheet";

/**
 * Hands the order to the phone's own print dialog.
 *
 * Android's dialog carries "Save as PDF" in its destination list and iOS
 * offers the share sheet from the preview, so this reaches a saved file
 * without the app having to write one — the same deal Chrome gives the web
 * build, which is why both platforms show one button.
 *
 * See lib/printOrder.web.ts for the browser half.
 */
export const printOrder = async (
  order: SentOrder,
  patientText?: string,
): Promise<void> => {
  await Print.printAsync({ html: orderSheetHtml(order, patientText) });
};
