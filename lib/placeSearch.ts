/**
 * Typing an address instead of hunting for it on a map.
 *
 * This is the half of the Swiggy flow the app was missing. Their web experience
 * does not lean on the browser's location at all — a laptop cannot do better
 * than "somewhere in Indore" and theirs does not either. What carries it is a
 * search box: type "vijay nag", pick "Vijay Nagar, Indore", and the pin lands
 * there. Locating yourself is the secondary button.
 *
 * OpenStreetMap is the whole of it: no key, no billing, no account. It does not
 * know Indore's apartment blocks by name the way Google Places does, so a
 * search often lands on the colony rather than the building — which is why the
 * screen pairs it with a map to confirm on and a box to write the flat number
 * in. Between them that gap is closed without anyone holding an API key.
 */
/**
 * How long to wait after the last keystroke.
 *
 * Nominatim's usage policy allows one request a second, and a search box is the
 * easiest way in the world to breach that.
 */
export const SEARCH_DEBOUNCE_MS = 1100;

/** Enough of a query to be worth asking about. */
export const MIN_QUERY_LENGTH = 3;

/*
 * Roughly the area a rider would cover. Results are biased to it rather than
 * restricted — a customer whose building sits just outside the box should still
 * find it, they just should not have to scroll past Indore in the United States
 * to do so.
 */
const BIAS_BOX = { west: 75.6, north: 22.9, east: 76.1, south: 22.5 };

/** The city every one of these searches is implicitly about. */
const CITY = "Indore";

export interface PlaceSuggestion {
  id: string;
  /** The name itself — "Vijay Nagar", "Treasure Island Mall". */
  title: string;
  /** Where that is — "Indore, Madhya Pradesh". Blank when there is nothing left. */
  subtitle: string;
  /** Set when the backend gave coordinates up front, as OpenStreetMap does. */
  latitude?: number;
  longitude?: number;
}

export interface ResolvedPlace {
  latitude: number;
  longitude: number;
  text: string;
}

const nominatimQuery = async (
  query: string,
  signal: AbortSignal,
): Promise<PlaceSuggestion[]> => {
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2" +
    "&addressdetails=1&countrycodes=in&limit=6&accept-language=en" +
    `&viewbox=${BIAS_BOX.west},${BIAS_BOX.north},${BIAS_BOX.east},${BIAS_BOX.south}` +
    `&q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json", "User-Agent": "GoliDawayi" },
  });

  if (!response.ok) return [];

  const body = (await response.json()) as {
    place_id?: number;
    lat?: string;
    lon?: string;
    name?: string;
    display_name?: string;
  }[];

  return body
    .map((entry): PlaceSuggestion | null => {
      const latitude = Number(entry.lat);
      const longitude = Number(entry.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

      // display_name runs widest-last, so the head of it is the place and the
      // tail is the context — the same split Google hands over ready-made.
      const segments = (entry.display_name ?? "")
        .split(", ")
        .filter((segment) => segment !== "India");

      const title = entry.name?.trim() || segments[0] || "";
      if (!title) return null;

      return {
        id: String(entry.place_id ?? `${latitude},${longitude}`),
        title,
        subtitle: segments.filter((segment) => segment !== title).join(", "),
        latitude,
        longitude,
      };
    })
    .filter((suggestion): suggestion is PlaceSuggestion => suggestion !== null);
};

/**
 * Two passes at OpenStreetMap, because one is not enough.
 *
 * Nominatim is a geocoder, not an autocomplete service: it matches whole words
 * against a structured index rather than completing what someone has started
 * typing, and a bare colony name frequently matches nothing at all. Naming the
 * city supplies the context a local would have taken for granted, and turns a
 * lot of empty result lists into useful ones.
 */
const nominatimSearch = async (
  query: string,
  signal: AbortSignal,
): Promise<PlaceSuggestion[]> => {
  const direct = await nominatimQuery(query, signal);
  if (direct.length > 0 || new RegExp(CITY, "i").test(query)) {
    return localFirst(direct);
  }

  return localFirst(await nominatimQuery(`${query}, ${CITY}`, signal));
};

/**
 * Indore results above everything else.
 *
 * The viewbox biases the search but does not fence it, so a colony name that
 * repeats across Madhya Pradesh — and many do — can put another city's version
 * near the top. Whoever is ordering here lives here.
 */
const localFirst = (suggestions: PlaceSuggestion[]): PlaceSuggestion[] => {
  const isLocal = (suggestion: PlaceSuggestion) =>
    new RegExp(CITY, "i").test(`${suggestion.title} ${suggestion.subtitle}`);

  return [
    ...suggestions.filter(isLocal),
    ...suggestions.filter((suggestion) => !isLocal(suggestion)),
  ];
};

/** Suggestions for what the customer has typed so far. Never throws. */
export const searchPlaces = async (
  query: string,
  signal: AbortSignal,
): Promise<PlaceSuggestion[]> => {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return [];

  try {
    return await nominatimSearch(trimmed, signal);
  } catch {
    // Aborted by the next keystroke, or the network gave out. Either way the
    // box should stay usable and the customer can still type an address.
    return [];
  }
};

/**
 * Coordinates for a chosen suggestion.
 *
 * Nominatim returns a point with every result, so this never has to go back out
 * to the network — it is a synchronous unpacking wearing an async signature,
 * kept that way because a geocoder that needs a second lookup is the normal
 * shape and this may not always be the only backend.
 */
export const resolvePlace = async (
  suggestion: PlaceSuggestion,
): Promise<ResolvedPlace | null> => {
  if (suggestion.latitude == null || suggestion.longitude == null) return null;

  return {
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
    text: [suggestion.title, suggestion.subtitle].filter(Boolean).join(", "),
  };
};
