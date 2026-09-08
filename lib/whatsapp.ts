import { Linking } from "react-native";

import { WHATSAPP_NUMBER } from "@/constants/data";
import type { Language } from "@/lib/i18n/translations";
import { LINK_LIFETIME_DAYS } from "@/lib/imgbb";
import { mapsLink } from "@/lib/location";

/**
 * Every order the app produces leaves through here.
 *
 * WhatsApp is the whole back office: there is no server, no order table and no
 * console, so this message *is* the order. Whoever reads it has to be able to
 * pack and deliver from it without asking a follow-up question, which is why
 * the format is fixed in one place rather than assembled per screen.
 *
 * The labels stay in English in both app languages. The reader is pharmacy
 * staff working a queue, not the customer, and one predictable shape they can
 * skim beats a message that changes structure with whoever sent it. Anything
 * the customer typed is passed through exactly as they wrote it.
 */

/** WhatsApp renders *this* as bold. */
const bold = (value: string) => `*${value}*`;

export type OrderMessage = {
  id: string;
  kind: OrderKind;
  customer: { name: string; phone: string };
  /**
   * Which language the customer has the app in.
   *
   * Carried because the number above gets rung, and whoever rings it should
   * know which language to open in. It costs one line and saves an awkward
   * first ten seconds.
   */
  language?: Language;
  /**
   * Who the medicines are for, when it is not the person ordering.
   *
   * Absent means the customer themselves, which is the common case and needs
   * no line. Present, it is the first thing a pharmacist checking a
   * prescription wants to know — a dose for a sixty-year-old and one for a
   * child are different orders of the same box.
   */
  patient?: FamilyMember;
  /** Someone to ring when the customer's own number does not answer. */
  emergency?: EmergencyContact | null;
  delivery: DeliveryAddress | null;
  lines?: OrderLine[];
  /** Medicines typed by hand, which the catalogue does not stock. */
  typedItems?: TypedItem[];
  prescriptionLinks?: string[];
  /** Photos the customer attached that failed to upload. */
  prescriptionsMissing?: number;
  notes?: string;
  prefs?: OrderPrefs;
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash on delivery",
  upi: "UPI on delivery",
};

/**
 * The three things that otherwise cost a phone call.
 *
 * Urgency leads, because it changes what happens next rather than merely
 * describing the order. Substitution is stated in both directions on purpose —
 * "brand as written" is an instruction the pharmacist needs, not the absence
 * of one, and silence would read as an oversight rather than a decision.
 */
const formatHandling = (prefs: OrderPrefs): string[] => [
  ...(prefs.urgent ? [bold("URGENT — customer is waiting")] : []),
  prefs.allowSubstitution
    ? "Generic substitute is OK if the brand is out"
    : "Brand as written — call before substituting",
  PAYMENT_LABELS[prefs.payment],
];

const formatDelivery = (delivery: DeliveryAddress | null): string[] => {
  if (!delivery) return ["Address not provided — please ask."];

  const lines: string[] = [];

  if (delivery.text) lines.push(delivery.text);

  if (delivery.latitude != null && delivery.longitude != null) {
    lines.push(mapsLink(delivery.latitude, delivery.longitude));

    // Worth saying out loud: a 500 m fix is a neighbourhood, not a doorstep,
    // and the person packing should know to ring before setting off. A place
    // the customer picked out of the search carries no such doubt, and saying
    // so tells the rider to follow the link rather than second-guess it from
    // the address line above.
    if (delivery.source === "search") {
      lines.push("(Location the customer searched for)");
    } else if (delivery.source === "gps") {
      lines.push(
        delivery.accuracy != null
          ? `(GPS pin, accurate to about ${Math.round(delivery.accuracy)} m)`
          : "(GPS pin)",
      );
    }
  }

  if (!delivery.text && delivery.latitude == null) {
    lines.push("Address not provided — please ask.");
  }

  return lines;
};

const HEADINGS: Record<OrderKind, string> = {
  cart: "New order",
  typedList: "New order — typed list",
  prescription: "New prescription",
  // Says up front that there is more than one list below, so nobody packs the
  // items and misses the prescription underneath them.
  mixed: "New order — items and prescription",
};

/** Renders the order as the plain text that goes into the WhatsApp draft. */
export const buildOrderMessage = (order: OrderMessage): string => {
  const blocks: string[] = [];

  blocks.push(
    [
      bold(`${HEADINGS[order.kind]} · GoliDawayi`),
      `Ref ${order.id}`,
    ].join("\n"),
  );

  blocks.push(
    [
      bold("Customer"),
      order.customer.name || "Name not given",
      // Ordering is gated on a number now, so this fallback should never fire.
      // It stays as the honest thing to print if one ever slips through.
      order.customer.phone || "Number not given — please ask",
      ...(order.language === "hi" ? ["Speaks Hindi"] : []),
      /*
       * The second number, on the same block as the first.
       *
       * A separate heading would read as somebody else's order. This is the
       * fallback for the number above it, and it belongs where whoever is
       * about to dial is already looking.
       */
      ...(order.emergency
        ? [
            `Also try ${order.emergency.name}${
              order.emergency.relation ? ` (${order.emergency.relation})` : ""
            }: ${order.emergency.phone}`,
          ]
        : []),
    ].join("\n"),
  );

  /*
   * Whose medicines these are, when it is not the customer's own.
   *
   * Its own block, above the items, because it changes how the items are
   * read: a pharmacist checking a prescription against an age needs this
   * before the list rather than after it.
   */
  if (order.patient) {
    blocks.push(
      [
        bold("For"),
        [
          order.patient.name,
          [order.patient.relation, order.patient.age]
            .filter(Boolean)
            .join(", "),
        ]
          .filter(Boolean)
          .join(" — "),
      ].join("\n"),
    );
  }

  blocks.push([bold("Deliver to"), ...formatDelivery(order.delivery)].join("\n"));

  /*
   * Names and quantities, no money.
   *
   * The message used to carry a subtotal, a delivery fee and a total from the
   * app's own catalogue — numbers nothing had checked against stock or the
   * day's MRP. The customer read them as a price and the pharmacy had to
   * correct them, so the quote now comes from the only party who can give one.
   */
  if (order.lines?.length) {
    blocks.push(
      [
        bold("Items"),
        ...order.lines.map(
          (line, index) => `${index + 1}. ${line.name} × ${line.quantity}`,
        ),
        "",
        "Please confirm availability and the total.",
      ].join("\n"),
    );
  }

  if (order.typedItems?.length) {
    blocks.push(
      [
        bold("Medicines requested"),
        ...order.typedItems.map(
          (item, index) => `${index + 1}. ${item.name} × ${item.quantity}`,
        ),
        "",
        "Typed by the customer — not from the app catalogue.",
      ].join("\n"),
    );
  }

  if (order.prescriptionLinks?.length) {
    blocks.push(
      [
        bold(`Prescription (${order.prescriptionLinks.length})`),
        ...order.prescriptionLinks,
        "",
        `Links stop working after ${LINK_LIFETIME_DAYS} days — save the images if you need them longer.`,
      ].join("\n"),
    );
  }

  if (order.prescriptionsMissing) {
    blocks.push(
      `${bold("Note")}\n${order.prescriptionsMissing} prescription photo(s) could not be uploaded. Please ask the customer to send them here directly.`,
    );
  }

  if (order.prefs) {
    blocks.push([bold("Handling"), ...formatHandling(order.prefs)].join("\n"));
  }

  if (order.notes?.trim()) {
    blocks.push([bold("Notes"), order.notes.trim()].join("\n"));
  }

  blocks.push("Sent from the GoliDawayi app.");

  return blocks.join("\n\n");
};

/**
 * A callback request for one of the services that has no ordering flow.
 *
 * Same destination, smaller message: there is nothing to deliver, so it carries
 * the number to ring and whatever the customer wanted to say.
 */
export const buildServiceRequestMessage = (request: {
  service: string;
  name: string;
  phone: string;
  /** Why they want the call — the one thing that makes it a useful one. */
  reason?: string;
  note?: string;
}): string => {
  const blocks = [
    bold(`Callback request · GoliDawayi`),
    [bold("Service"), request.service].join("\n"),
    [
      bold("Call back on"),
      request.phone,
      request.name || "Name not given",
    ].join("\n"),
  ];

  /*
   * Above the notes, because whoever picks this up reads top-down and this is
   * what tells them who to put on the call. A pharmacist and an insurance desk
   * are different people.
   */
  if (request.reason?.trim()) {
    blocks.push([bold("Reason"), request.reason.trim()].join("\n"));
  }

  if (request.note?.trim()) {
    blocks.push([bold("Notes"), request.note.trim()].join("\n"));
  }

  blocks.push("Sent from the GoliDawayi app.");

  return blocks.join("\n\n");
};

/**
 * Hands the message to WhatsApp.
 *
 * The draft opens with the text already written, but the customer still presses
 * send — so nothing leaves the phone without them seeing exactly what goes.
 * Returns false when WhatsApp cannot be opened, so the caller can offer the
 * phone number instead of leaving a dead button.
 */
export const openWhatsAppWith = async (text: string): Promise<boolean> => {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
};
