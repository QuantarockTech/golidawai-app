import { orderSheetHtml } from "@/lib/orderSheet";

/**
 * Prints the order from a frame of its own.
 *
 * Not `window.print()` on the page itself. Printing the live app meant hiding
 * every element with `@media print` and positioning a hidden sheet over the
 * top — a trick that fights react-native-web's generated styles and leaves a
 * blank first page the moment the layout underneath does not collapse the way
 * it was assumed to.
 *
 * A frame sidesteps all of it: the document inside is the same standalone HTML
 * `expo-print` renders on a phone, with nothing of the app around it, so both
 * platforms print from one source and the page cannot be affected by anything
 * on screen.
 */
export const printOrder = async (
  order: SentOrder,
  patientText?: string,
): Promise<void> => {
  const frame = document.createElement("iframe");

  // Off-screen rather than display:none — a frame that was never laid out has
  // nothing to paint, and Safari prints it blank.
  frame.setAttribute(
    "style",
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;",
  );
  frame.setAttribute("aria-hidden", "true");
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    return;
  }

  doc.open();
  doc.write(orderSheetHtml(order, patientText));
  doc.close();

  await new Promise<void>((resolve) => {
    /*
     * Printed on the next frame rather than immediately.
     *
     * `document.write` finishes synchronously but layout does not, and asking
     * a frame to print before it has been laid out produces an empty page.
     */
    requestAnimationFrame(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      resolve();
    });
  });

  /*
   * Left in place for a moment. The print dialog is modal in some browsers and
   * reads the frame while it is open, so removing it on the next line can take
   * the document out from under the dialog.
   */
  setTimeout(() => frame.remove(), 60_000);
};
