import { icons } from "./icons";

export const tabs: AppTab[] = [
  { name: "index", title: "Home", icon: icons.home },
  { name: "subscriptions", title: "Subscriptions", icon: icons.wallet },
  { name: "insights", title: "Insights", icon: icons.activity },
  { name: "settings", title: "Settings", icon: icons.setting },
];

export const HOME_USER = {
  name: "Adrian | JS Mastery",
};

export const HOME_BALANCE = {
  amount: 2489.48,
  nextRenewalDate: "2026-03-18T09:00:00.000Z",
};

export const UPCOMING_SUBSCRIPTIONS: UpcomingSubscription[] = [
  {
    id: "spotify",
    icon: icons.spotify,
    name: "Spotify",
    price: 5.99,
    currency: "USD",
    daysLeft: 2,
  },
  {
    id: "notion",
    icon: icons.notion,
    name: "Notion",
    price: 12.0,
    currency: "USD",
    daysLeft: 4,
  },
  {
    id: "figma",
    icon: icons.figma,
    name: "Figma",
    price: 15.0,
    currency: "USD",
    daysLeft: 6,
  },
];

export const HOME_SUBSCRIPTIONS: Subscription[] = [
  {
    id: "adobe-creative-cloud",
    icon: icons.adobe,
    name: "Adobe Creative Cloud",
    plan: "Teams Plan",
    category: "Design",
    paymentMethod: "Visa ending in 8530",
    status: "active",
    startDate: "2025-03-20T10:00:00.000Z",
    price: 77.49,
    currency: "USD",
    billing: "Monthly",
    renewalDate: "2026-03-20T10:00:00.000Z",
    color: "#f5c542",
  },
  {
    id: "github-pro",
    icon: icons.github,
    name: "GitHub Pro",
    plan: "Developer",
    category: "Developer Tools",
    paymentMethod: "Mastercard ending in 2408",
    status: "active",
    startDate: "2024-11-24T10:00:00.000Z",
    price: 9.99,
    currency: "USD",
    billing: "Monthly",
    renewalDate: "2026-03-24T10:00:00.000Z",
    color: "#e8def8",
  },
  {
    id: "claude-pro",
    icon: icons.claude,
    name: "Claude Pro",
    plan: "Pro Plan",
    category: "AI Tools",
    paymentMethod: "Amex ending in 1010",
    status: "paused",
    startDate: "2025-06-27T10:00:00.000Z",
    price: 20.0,
    currency: "USD",
    billing: "Monthly",
    renewalDate: "2026-03-27T10:00:00.000Z",
    color: "#b8d4e3",
  },
  {
    id: "canva-pro",
    icon: icons.canva,
    name: "Canva Pro",
    plan: "Yearly Access",
    category: "Design",
    paymentMethod: "Visa ending in 7784",
    status: "cancelled",
    startDate: "2024-04-02T10:00:00.000Z",
    price: 119.99,
    currency: "USD",
    billing: "Yearly",
    renewalDate: "2026-04-02T10:00:00.000Z",
    color: "#b8e8d0",
  },
];

/*
 * Home dashboard content — concept board frame 04.
 *
 * Placeholder, exactly like HOME_SUBSCRIPTIONS above: there is no backend yet,
 * so these are the board's own sample values. Labels live in the translation
 * dictionary rather than here, so the list works in both languages.
 */
export const QUICK_ACTIONS: QuickAction[] = [
  { key: "uploadRx", icon: "camera-outline", tone: "brand" },
  { key: "orderMedicine", icon: "pill", tone: "brand" },
  // The board uses emergency red here and nowhere else, so it is instantly
  // recognisable as the one urgent action on the screen.
  { key: "ambulance", icon: "ambulance", tone: "emergency" },
  { key: "doctorConsult", icon: "heart-pulse", tone: "brand" },
  { key: "labTests", icon: "file-document-outline", tone: "brand" },
  { key: "insurance", icon: "shield-check-outline", tone: "brand" },
];

export const REORDER_ITEMS: ReorderItem[] = [
  { id: "dolo-650", name: "Dolo 650", tabletsPerStrip: 15, price: 32 },
  { id: "shelcal-500", name: "Shelcal 500", tabletsPerStrip: 15, price: 118 },
];

/** Pharmacy line the "Call to order" banner dials. Placeholder until confirmed. */
export const PHARMACY_PHONE = "+911234567890";

/** WhatsApp ordering line behind the floating button. Placeholder. */
export const WHATSAPP_NUMBER = "911234567890";
