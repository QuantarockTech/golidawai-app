
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

/**
 * What the home screen offers a customer who has never ordered.
 *
 * Six common medicines, kept in code on purpose. The real catalogue now comes
 * from the pharmacy's spreadsheet over the network (see lib/catalogue.ts), and
 * a first-time customer on a cold start would otherwise be shown an empty
 * reorder list while that loads. These are a suggestion, not history — the
 * heading above them says so — and they are matched to the sheet by name once
 * it arrives, so tapping one adds the pharmacy's own row to the cart.
 */
export const REORDER_ITEMS: ReorderItem[] = [
  { id: "dolo-650mg-tab", name: "DOLO 650MG TAB" },
  { id: "pan-40-mg-tab", name: "PAN 40 MG TAB" },
  { id: "zincovit-tab", name: "ZINCOVIT TAB" },
  { id: "combiflam-tab", name: "COMBIFLAM TAB" },
  { id: "becosules-capsules", name: "BECOSULES CAPSULES" },
  { id: "digene-orange-syp", name: "DIGENE ORANGE SYP" },
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
