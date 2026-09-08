import dayjs from "dayjs";

import { PHARMACY } from "@/constants/data";

/**
 * An order as a printable page, for both platforms.
 *
 * One HTML document rather than a React tree, because the two printers take
 * completely different input: `expo-print` on a phone is handed a string, and
 * the browser gets it written into a hidden frame. Building it here means the
 * paper looks the same either way instead of drifting into two sheets that
 * slowly stop matching.
 *
 * Styles are inline for the same reason. The document has to stand on its own
 * inside a print engine that has never seen global.css.
 *
 * Never called a bill, and it says so on its face. There are no prices in this
 * app: the catalogue carries none and the WhatsApp message asks the pharmacy to
 * quote. A page headed "bill" with no amounts, no GSTIN and no tax breakdown
 * would be misleading in a country where a pharmacy invoice is a tax document
 * the pharmacy issues.
 */

/**
 * Everything on this page came from a text field.
 *
 * Medicine names are typed by the customer and addresses come back from a
 * geocoder, so both reach here as arbitrary strings. Interpolating them into
 * markup without this would let a stray `<` break the page — and on web the
 * document is written into a live frame, where it would be worse than broken.
 */
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const list = (items: { name: string; quantity: number }[]): string =>
  `<ol>${items
    .map(
      (item) =>
        `<li>${escapeHtml(item.name)} &times; ${item.quantity}</li>`,
    )
    .join("")}</ol>`;

const line = (label: string, value: string): string =>
  `<p class="line"><strong>${label}:</strong> ${escapeHtml(value)}</p>`;

export const orderSheetHtml = (
  order: SentOrder,
  patientText?: string,
): string => {
  const sections: string[] = [];

  if (patientText) sections.push(line("For", patientText));
  if (order.deliveryText) sections.push(line("Delivering to", order.deliveryText));

  if (order.lines.length > 0) {
    sections.push(`<h2>Medicines</h2>${list(order.lines)}`);
  }

  if (order.typedItems.length > 0) {
    sections.push(`<h2>Written in by hand</h2>${list(order.typedItems)}`);
  }

  if (order.prescriptionCount > 0) {
    sections.push(
      line("Prescriptions attached", String(order.prescriptionCount)),
    );
  }

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>GoliDawayi — order ${escapeHtml(order.id)}</title>
<style>
  @page { margin: 16mm; }
  body {
    margin: 0;
    color: #000;
    font-family: -apple-system, Roboto, system-ui, sans-serif;
    font-size: 12pt;
    line-height: 1.5;
  }
  h1 { margin: 0; font-size: 20pt; letter-spacing: -0.01em; }
  h2 { margin: 18px 0 6px; font-size: 13pt; }
  .meta { margin: 2px 0 16px; color: #444; font-size: 11pt; }
  .line { margin: 4px 0; }
  ol { margin: 0; padding-left: 20px; }
  li { margin: 2px 0; }
  /* Set off by a rule, so nobody mistakes the page for an invoice. */
  .note {
    margin-top: 22px;
    padding-top: 10px;
    border-top: 1px solid #bbb;
    color: #444;
    font-size: 10pt;
  }
</style>
</head>
<body>
  <h1>GoliDawayi</h1>
  <p class="meta">Order ${escapeHtml(order.id)} &middot; sent ${escapeHtml(
    dayjs(order.sentAt).format("D MMMM YYYY, h:mm A"),
  )}</p>
  ${sections.join("\n  ")}
  <p class="note">
    This is a record of what was requested, not a bill. Prices are quoted by the
    pharmacy on WhatsApp. ${escapeHtml(PHARMACY.phoneDisplay)}
  </p>
</body>
</html>`;
};
