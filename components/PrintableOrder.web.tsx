import dayjs from "dayjs";

import { type PrintableOrderProps } from "@/components/PrintableOrder.types";
import { PHARMACY } from "@/constants/data";
import "@/global.css";

/**
 * The order as a sheet of paper.
 *
 * Plain HTML rather than React Native views, and deliberately. This is the one
 * thing on the screen that has to survive Chrome's print dialog, and React
 * Native Web renders flex boxes with generated class names that print badly and
 * cannot be targeted from a stylesheet. Semantic markup prints the way markup
 * has always printed.
 *
 * Hidden on screen and revealed only by `@media print` — see `.gd-print-sheet`
 * in global.css, which hides the running app by visibility rather than display
 * so this can be positioned over it without the app leaving a blank first page.
 *
 * Never called a bill. There are no prices in this app: the catalogue carries
 * none, and the WhatsApp message asks the pharmacy to quote. A document titled
 * "bill" with no amounts on it would be worse than useless in a country where
 * a pharmacy invoice is a tax document the pharmacy issues.
 */
export default function PrintableOrder({
  order,
  patientText,
}: PrintableOrderProps) {
  return (
    <div className="gd-print-sheet" aria-hidden>
      <h1>GoliDawayi</h1>
      <p className="gd-print-meta">
        Order {order.id} · sent{" "}
        {dayjs(order.sentAt).format("D MMMM YYYY, h:mm A")}
      </p>

      {patientText ? (
        <p className="gd-print-line">
          <strong>For:</strong> {patientText}
        </p>
      ) : null}

      {order.deliveryText ? (
        <p className="gd-print-line">
          <strong>Delivering to:</strong> {order.deliveryText}
        </p>
      ) : null}

      {order.lines.length > 0 ? (
        <>
          <h2>Medicines</h2>
          <ol>
            {order.lines.map((line) => (
              <li key={line.id}>
                {line.name} × {line.quantity}
              </li>
            ))}
          </ol>
        </>
      ) : null}

      {order.typedItems.length > 0 ? (
        <>
          <h2>Written in by hand</h2>
          <ol>
            {order.typedItems.map((item) => (
              <li key={item.name}>
                {item.name} × {item.quantity}
              </li>
            ))}
          </ol>
        </>
      ) : null}

      {order.prescriptionCount > 0 ? (
        <p className="gd-print-line">
          <strong>Prescriptions attached:</strong> {order.prescriptionCount}
        </p>
      ) : null}

      {/*
        The line that keeps this honest, and the reason it can be handed to
        anyone. Small, but not hidden — it is the difference between a record
        and a receipt.
      */}
      <p className="gd-print-note">
        This is a record of what was requested, not a bill. Prices are quoted by
        the pharmacy on WhatsApp. {PHARMACY.phoneDisplay}
      </p>
    </div>
  );
}
