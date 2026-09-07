import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * The medicine list, read from the pharmacy's own spreadsheet.
 *
 * The catalogue used to be eighteen medicines hard-coded in constants/data.ts,
 * which meant a price change or a new product needed a developer, a build and a
 * deploy. This reads a Google Sheet the pharmacy edits directly, so the person
 * who knows the stock is the person who changes it.
 *
 * Published through Sheets' own "Publish to web" as CSV, which needs no API
 * key, no Cloud project and no billing account — the constraint that decided
 * the mapping stack too. Verified to send `Access-Control-Allow-Origin: *` on
 * the final response and to echo the Origin on its redirect hop, so the browser
 * build can read it directly and no proxy is involved.
 *
 * Google caches the published file for about five minutes, so an edit reaches
 * customers on roughly that delay. Nothing here can shorten it.
 */

/**
 * Overridable per build, but rarely worth it: an EXPO_PUBLIC_ value is baked in
 * at build time, so pointing at a different sheet needs a rebuild either way.
 * The URL is public by construction — publishing is what makes it readable — so
 * there is nothing here to keep out of the bundle.
 */
const CATALOGUE_URL =
  process.env.EXPO_PUBLIC_CATALOGUE_URL ??
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQPiC71qWjSvqoKHUG_UgMd9oivIxdIS4SEeccGld5Uwl37EwlWO7sfULrsSldBQ_bRuYtzQfmKhMAM/pub?gid=450037292&single=true&output=csv";

const STORAGE_KEY = "golidawayi.catalogue.v1";

/** Long enough for a slow connection, short enough not to hold a screen. */
const FETCH_TIMEOUT_MS = 12_000;

/**
 * Splits CSV into rows of fields, respecting quotes.
 *
 * Hand-written rather than pulled from npm because the whole job is one pass
 * over a string, and a parser is a poor reason to add a dependency to a React
 * Native bundle. It handles what a spreadsheet export actually emits: quoted
 * fields, commas and newlines inside them, "" as an escaped quote, and both
 * CRLF and LF line endings.
 */
export const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        // A doubled quote is a literal one; a lone quote closes the field.
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      // Swallow the LF of a CRLF pair rather than emitting a blank row.
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  // Whatever is still in hand when the string ends is the last field, unless
  // the file ended on a newline and there is nothing left to flush.
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
};

/**
 * A stable id for a row, built from the name alone.
 *
 * The sheet's Pack Size and Discount columns are read by the pharmacy, not by
 * the app — the client asked for neither on screen — so a product is only ever
 * identified by what a customer can actually see. That has a consequence worth
 * knowing: the sheet lists a handful of products at two sizes (CANDID POWDER at
 * 60GM and 120GM, TELMA 40 TAB at 15'S and 30'S), and with the size hidden
 * those would be two rows a customer cannot tell apart. The first of each wins
 * and the rest are dropped, which is the honest reading of a list that cannot
 * show the thing that distinguishes them.
 */
const idFor = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Turns the sheet into medicines, skipping what cannot be sold.
 *
 * Columns are read by header name rather than position, so the pharmacy can
 * reorder them or add their own without breaking anything. `Category` is read
 * if it exists and ignored if it does not, which is what lets the filter chips
 * appear the day that column is added rather than the day the app is rebuilt.
 */
export const parseCatalogue = (csv: string): Medicine[] => {
  const rows = parseCsv(csv);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const at = (row: string[], header: string): string => {
    const index = headers.indexOf(header);
    return index === -1 ? "" : (row[index] ?? "").trim();
  };

  const seen = new Set<string>();
  const medicines: Medicine[] = [];

  for (const row of rows.slice(1)) {
    const name = at(row, "product name");
    // A row with no name is a spacer or a half-finished edit, not a product.
    if (!name) continue;

    const id = idFor(name);

    // First wins — see idFor for why two rows can share a name here.
    if (seen.has(id)) continue;
    seen.add(id);

    const category = at(row, "category").toLowerCase();
    const company = at(row, "company name");

    medicines.push({
      id,
      name,
      ...(company ? { company } : {}),
      ...(category ? { category } : {}),
      /*
       * Every catalogue item is treated as needing a pharmacist's eye. The
       * sheet carries no prescription flag, and the client chose review-all
       * over guessing which of seven hundred products is over the counter.
       */
      rxRequired: true,
    });
  }

  return medicines;
};

/** The categories actually present, in the order the sheet first mentions them. */
export const categoriesOf = (medicines: Medicine[]): string[] => {
  const seen: string[] = [];
  for (const medicine of medicines) {
    if (medicine.category && !seen.includes(medicine.category)) {
      seen.push(medicine.category);
    }
  }
  return seen;
};

/** The last catalogue that loaded, so the screen opens on something. */
export const readCachedCatalogue = async (): Promise<Medicine[] | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? (parsed as Medicine[])
      : null;
  } catch {
    // Corrupt or unreadable. The network copy is the real one anyway.
    return null;
  }
};

const writeCachedCatalogue = async (medicines: Medicine[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(medicines));
  } catch {
    // A full disk costs the next cold start its head start, nothing more.
  }
};

/**
 * Fetches the sheet and caches what comes back.
 *
 * Throws rather than returning empty on failure, so the caller can tell "the
 * pharmacy sells nothing" from "the network is down" — the first should show an
 * empty catalogue, the second should keep showing the cached one.
 */
export const fetchCatalogue = async (): Promise<Medicine[]> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(CATALOGUE_URL, {
      signal: controller.signal,
      headers: { Accept: "text/csv" },
    });

    if (!response.ok) {
      throw new Error(`Catalogue responded ${response.status}`);
    }

    const medicines = parseCatalogue(await response.text());

    // An empty parse from a 200 means the sheet was unpublished or emptied.
    // Keeping the cache is the safer read of that than wiping the catalogue.
    if (medicines.length > 0) await writeCachedCatalogue(medicines);

    return medicines;
  } finally {
    clearTimeout(timer);
  }
};
