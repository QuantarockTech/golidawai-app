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

  /** Ambulance Booking — concept board frame 07. */
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

  /** Checkout & Tracking — concept board frame 08. */
  type OrderStatus = "placed" | "verified" | "packed" | "outForDelivery";

  interface OrderLine {
    id: string;
    name: string;
    quantity: number;
    /** Line total, not unit price. */
    price: number;
  }

  interface Order {
    /** Display id, e.g. "GD1042". */
    id: string;
    placedAt: string;
    status: OrderStatus;
    lines: OrderLine[];
    deliveryFee: number;
    total: number;
    /** Set when any line needed a prescription, so it shows the review step. */
    needsPharmacistReview: boolean;
  }
}

export { };

