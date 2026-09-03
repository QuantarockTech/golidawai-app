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
}

export { };

