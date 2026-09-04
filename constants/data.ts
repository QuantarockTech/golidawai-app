
/*
 * Home dashboard content — concept board frame 04.
 *
 * Placeholder data: there is no backend yet, so these are the board's own
 * sample values. Labels live in the translation
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
  // TEMPORARY test number. Revert to +919755517194 / "+91 9755517194".
  phone: "+919755683486",
  /** Same line, formatted for display rather than for the dialler. */
  phoneDisplay: "+91 9755683486",
  email: "ravi@golidawayi.com",
} as const;

/** Pharmacy line the "Call to order" banner dials. */
export const PHARMACY_PHONE = PHARMACY.phone;

/** India's national emergency ambulance line. */
export const AMBULANCE_PHONE = "108";

/** WhatsApp ordering line behind the floating button. wa.me wants no "+". */
// TEMPORARY test number. Revert to "919755517194".
export const WHATSAPP_NUMBER = "919755683486";
