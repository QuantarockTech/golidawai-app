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
  { id: "pan-40", name: "Pan 40", tabletsPerStrip: 15, price: 145 },
  { id: "azithral-500", name: "Azithral 500", tabletsPerStrip: 5, price: 98 },
  { id: "ecosprin-75", name: "Ecosprin 75", tabletsPerStrip: 14, price: 12 },
  { id: "thyronorm-50", name: "Thyronorm 50mcg", tabletsPerStrip: 30, price: 165 },
];

/** Catalogue behind Order Medicines — concept board frame 06. */
export const MEDICINES: Medicine[] = [
  { id: "dolo-650", name: "Dolo 650", tabletsPerStrip: 15, price: 32, category: "fever", rxRequired: false },
  { id: "calpol-500", name: "Calpol 500", tabletsPerStrip: 15, price: 28, category: "fever", rxRequired: false },
  { id: "azithral-500", name: "Azithral 500", tabletsPerStrip: 5, price: 98, category: "fever", rxRequired: true },
  { id: "augmentin-625", name: "Augmentin 625", tabletsPerStrip: 10, price: 214, category: "fever", rxRequired: true },
  { id: "metformin-500", name: "Metformin 500", tabletsPerStrip: 20, price: 46, category: "diabetes", rxRequired: true },
  { id: "glycomet-gp1", name: "Glycomet GP1", tabletsPerStrip: 15, price: 89, category: "diabetes", rxRequired: true },
  { id: "januvia-50", name: "Januvia 50", tabletsPerStrip: 14, price: 412, category: "diabetes", rxRequired: true },
  { id: "candid-cream", name: "Candid Cream 20g", tabletsPerStrip: 1, price: 92, category: "skin", rxRequired: false },
  { id: "betnovate-n", name: "Betnovate-N 20g", tabletsPerStrip: 1, price: 58, category: "skin", rxRequired: true },
  { id: "ecosprin-75", name: "Ecosprin 75", tabletsPerStrip: 14, price: 12, category: "heart", rxRequired: false },
  { id: "atorva-10", name: "Atorva 10", tabletsPerStrip: 15, price: 105, category: "heart", rxRequired: true },
  { id: "telma-40", name: "Telma 40", tabletsPerStrip: 15, price: 138, category: "heart", rxRequired: true },
  { id: "pan-40", name: "Pan 40", tabletsPerStrip: 15, price: 145, category: "stomach", rxRequired: false },
  { id: "digene-gel", name: "Digene Gel 200ml", tabletsPerStrip: 1, price: 132, category: "stomach", rxRequired: false },
  { id: "shelcal-500", name: "Shelcal 500", tabletsPerStrip: 15, price: 118, category: "vitamins", rxRequired: false },
  { id: "thyronorm-50", name: "Thyronorm 50mcg", tabletsPerStrip: 30, price: 165, category: "vitamins", rxRequired: true },
  { id: "zincovit", name: "Zincovit", tabletsPerStrip: 15, price: 108, category: "vitamins", rxRequired: false },
];

/** Chip order for the category filter; "All" is prepended in the screen. */
export const MEDICINE_CATEGORIES: MedicineCategory[] = [
  "fever",
  "diabetes",
  "skin",
  "heart",
  "stomach",
  "vitamins",
];

/** Ambulance tiers — concept board frame 07. */
export const AMBULANCE_TYPES: AmbulanceType[] = [
  { id: "bls", etaMinutes: 6, price: 499 },
  { id: "icu", etaMinutes: 9, price: 1299 },
];

/** Services with no board frame; they share one callback-request screen. */
export const SERVICE_KEYS: ServiceKey[] = [
  "doctorConsult",
  "labTests",
  "insurance",
];

/**
 * The pharmacy behind the app. Single source of truth for anything that needs
 * to call, message, email or show where the shop is.
 */
export const PHARMACY = {
  name: "Medicio",
  addressLines: [
    "444, Shyam Nagar (Main), Sukhliya",
    "Indore, M.P, India-452010",
  ],
  phone: "+919755517194",
  /** Same line, formatted for display rather than for the dialler. */
  phoneDisplay: "+91 9755517194",
  email: "ravi@golidawayi.com",
} as const;

/** Pharmacy line the "Call to order" banner dials. */
export const PHARMACY_PHONE = PHARMACY.phone;

/** India's national emergency ambulance line. */
export const AMBULANCE_PHONE = "108";

/** WhatsApp ordering line behind the floating button. wa.me wants no "+". */
export const WHATSAPP_NUMBER = "919755517194";
