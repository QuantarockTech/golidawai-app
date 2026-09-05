import type { ImageSourcePropType } from "react-native";

declare global {
  interface AppTab {
    name: string;
    title: string;
    icon: ImageSourcePropType;
  }

  interface TabIconProps {
    focused: boolean;
    icon: ImageSourcePropType;
  }

  interface Subscription {
    id: string;
    icon: ImageSourcePropType;
    name: string;
    plan?: string;
    category?: string;
    paymentMethod?: string;
    status?: string;
    startDate?: string;
    price: number;
    currency?: string;
    frequency?: "Monthly" | "Yearly";
    billing: string;
    renewalDate?: string;
    color?: string;
  }

  interface SubscriptionCardProps extends Omit<Subscription, "id"> {
    expanded: boolean;
    onPress: () => void;
    onCancelPress?: () => void;
    isCancelling?: boolean;
  }

  interface UpcomingSubscription {
    id: string;
    icon: ImageSourcePropType;
    name: string;
    price: number;
    currency?: string;
    daysLeft: number;
  }

  interface UpcomingSubscriptionCardProps extends Omit<
    UpcomingSubscription,
    "id"
  > {}

  interface ListHeadingProps {
    title: string;
  }

  /** Home dashboard — concept board frame 04. */
  type QuickActionKey =
    | "uploadRx"
    | "orderMedicine"
    | "ambulance"
    | "doctorConsult"
    | "labTests"
    | "insurance";

  interface QuickAction {
    key: QuickActionKey;
    /** MaterialCommunityIcons glyph name. */
    icon: string;
    /** "emergency" is reserved for Ambulance — the board uses red nowhere else. */
    tone: "brand" | "emergency";
  }

  interface ReorderItem {
    id: string;
    name: string;
    /** Tablets per strip; the label itself is translated, not stored. */
    tabletsPerStrip: number;
    price: number;
  }

  /** Order Medicines — concept board frame 06. */
  type MedicineCategory =
    | "fever"
    | "diabetes"
    | "skin"
    | "heart"
    | "stomach"
    | "vitamins";

  interface Medicine extends ReorderItem {
    category: MedicineCategory;
    /** Routes the item into the pharmacist-review queue at checkout. */
    rxRequired: boolean;
  }

  /**
   * Ambulance Booking — concept board frame 07.
   *
   * `price` is data the screen no longer shows: the fare belongs to whoever
   * dispatches the vehicle, not to an app that only places the call. Kept so
   * the decision is reversible, in step with `Medicine.price`.
   */
  interface AmbulanceType {
    id: string;
    /** Minutes to arrival, as quoted on the board. */
    etaMinutes: number;
    price: number;
  }

  /**
   * Services the board doesn't design a screen for. They share one
   * request-a-callback screen rather than three invented flows.
   */
  type ServiceKey = "doctorConsult" | "labTests" | "insurance";

  /**
   * Where an order is going.
   *
   * `text` is what a human reads — either typed by the customer or resolved
   * from GPS. The coordinates ride alongside when the device supplied them,
   * because a map pin locates a house in a way an Indore address rarely does.
   */
  interface DeliveryAddress {
    text: string;
    latitude?: number;
    longitude?: number;
    /** Metres of GPS uncertainty, when the device reported it. */
    accuracy?: number;
    /**
     * How the coordinates were arrived at. `map` outranks `gps`: the device
     * only ever guesses, whereas a customer who dragged the pin onto their own
     * roof was looking at the answer.
     */
    source: "gps" | "manual" | "map";
    savedAt: string;
  }

  /**
   * How the customer wants an order handled.
   *
   * Cash and UPI only. A neighbourhood pharmacy's rider carries a wallet and a
   * QR code, not a card machine — add "card" here and to PAYMENT_LABELS in
   * lib/whatsapp.ts if that stops being true.
   */
  type PaymentMethod = "cash" | "upi";

  interface OrderPrefs {
    /** Whether an equivalent generic may be sent when the brand is out. */
    allowSubstitution: boolean;
    payment: PaymentMethod;
    /** True only for the order being sent right now; never persisted. */
    urgent: boolean;
  }

  /**
   * A medicine and how much of it, with no money attached.
   *
   * The app quotes nothing. Catalogue prices were never checked against stock
   * or the day's MRP, so every figure it could print would be a guess the
   * customer reads as a promise — and the pharmacy has to correct it in the
   * reply anyway. `Medicine.price` still exists in the catalogue data, unread,
   * so this is a decision that can be undone rather than a deletion.
   */
  interface OrderLine {
    id: string;
    name: string;
    quantity: number;
  }

  /**
   * A medicine the customer typed because the catalogue doesn't stock it.
   *
   * Carries a quantity for the same reason a catalogue line does: "Dolo 650"
   * and "Dolo 650 × 3" are different orders, and a pharmacy reading the first
   * has to ring up to find out which was meant.
   */
  interface TypedItem {
    name: string;
    quantity: number;
  }

  /**
   * What an order is made of — they read differently in the history.
   *
   * `mixed` covers a basket holding more than one of catalogue items, typed
   * medicines and prescriptions, which is the normal case once all three go in
   * a single message. Derive it with `orderKindOf` rather than by hand.
   */
  type OrderKind = "cart" | "typedList" | "prescription" | "mixed";

  /**
   * A record of what was handed to WhatsApp.
   *
   * Not an order in any system sense: nothing here was placed, priced or
   * accepted, and no server has a copy. It exists so the customer can see what
   * they asked for and when, which is the whole of what the app can honestly
   * claim once WhatsApp takes over.
   */
  interface SentOrder {
    /** Display id, e.g. "GD1042", quoted in the WhatsApp message. */
    id: string;
    sentAt: string;
    kind: OrderKind;
    lines: OrderLine[];
    /** Free-text medicines the customer typed rather than picked. */
    typedItems: TypedItem[];
    prescriptionCount: number;
    /** Flattened at send time; the saved address can change afterwards. */
    deliveryText: string;
    needsPharmacistReview: boolean;
  }
}

export { };

