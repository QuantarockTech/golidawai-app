/**
 * Typing an address instead of hunting for it on a map.
 *
 * This is the half of the Swiggy flow the app was missing. Their web experience
 * does not lean on the browser's location at all — a laptop cannot do better
 * than "somewhere in Indore" and theirs does not either. What carries it is a
 * search box: type "vijay nag", pick "Vijay Nagar, Indore", and the pin lands
 * there. Locating yourself is the secondary button.
 *
 * Two backends behind one interface. Google Places is what the food apps use
 * and what knows Indian apartment blocks and shop names by name; OpenStreetMap
 * is the fallback that needs no key, no billing and no account, so the feature
 * works the day it ships and improves when a key appears.
 */
import { DEFAULT_CENTRE } from "@/lib/location";

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY;

/** Whether the good backend is configured. Everything still runs without it. */
export const usingGooglePlaces = Boolean(GOOGLE_KEY);

/**
 * How long to wait after the last keystroke.
 *
 * Google bills a session rather than a keystroke, so it can afford to feel
 * immediate. Nominatim's usage policy allows one request a second, and a search
 * box is the easiest way in the world to breach that.
 */
export const SEARCH_DEBOUNCE_MS = usingGooglePlaces ? 300 : 1100;

/** Enough of a query to be worth asking about. */
export const MIN_QUERY_LENGTH = 3;

/*
 * Roughly the distance a rider would go. Results are biased to it rather than
 * restricted — a customer whose building sits just outside the box should still
 * find it, they just should not have to scroll past Indore in the United States
 * to do so.
 */
const BIAS_RADIUS_M = 40_000;
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

/*
 * Google prices a burst of keystrokes plus the lookup that follows as one
 * session, but only when they share a token. Without one, every keystroke is
 * billed on its own — the difference between a rounding error and a real bill.
 *
 * It does not need to be unguessable, only unique, so this avoids pulling in a
 * crypto module for it.
 */
let sessionToken = "";

const newToken = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

/** Call when a search box opens, and again after a suggestion is taken. */
export const startPlaceSession = () => {
  sessionToken = newToken();
};

const googleSearch = async (
  query: string,
  signal: AbortSignal,
): Promise<PlaceSuggestion[]> => {
  if (!sessionToken) startPlaceSession();

  const response = await fetch(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_KEY as string,
      },
      body: JSON.stringify({
        input: query,
        sessionToken,
        includedRegionCodes: ["in"],
        locationBias: {
          circle: {
            center: {
              latitude: DEFAULT_CENTRE.latitude,
              longitude: DEFAULT_CENTRE.longitude,
            },
            radius: BIAS_RADIUS_M,
          },
        },
      }),
    },
  );

  if (!response.ok) return [];

  const body = (await response.json()) as {
    suggestions?: {
      placePrediction?: {
        placeId?: string;
        text?: { text?: string };
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
      };
    }[];
  };

  return (body.suggestions ?? [])
    .map((entry) => entry.placePrediction)
    .filter((prediction) => prediction?.placeId)
    .map((prediction) => ({
      id: prediction!.placeId!,
      title:
        prediction!.structuredFormat?.mainText?.text ??
        prediction!.text?.text ??
        "",
      subtitle: prediction!.structuredFormat?.secondaryText?.text ?? "",
    }))
    .filter((suggestion) => suggestion.title);
};

/**
 * Turns a Google suggestion into coordinates.
 *
 * Autocomplete deliberately withholds them — the place has to be asked for by
 * id, and that request is what closes the billing session the keystrokes opened.
 */
const googleResolve = async (
  suggestion: PlaceSuggestion,
  signal?: AbortSignal,
): Promise<ResolvedPlace | null> => {
  const url =
    `https://places.googleapis.com/v1/places/${encodeURIComponent(suggestion.id)}` +
    `?sessionToken=${encodeURIComponent(sessionToken)}`;

  const response = await fetch(url, {
    signal,
    headers: {
      "X-Goog-Api-Key": GOOGLE_KEY as string,
      "X-Goog-FieldMask": "location,formattedAddress",
    },
  });

  // Spent or not, the session is over the moment a place is chosen.
  startPlaceSession();

  if (!response.ok) return null;

  const body = (await response.json()) as {
    location?: { latitude?: number; longitude?: number };
    formattedAddress?: string;
  };

  const { latitude, longitude } = body.location ?? {};
  if (latitude == null || longitude == null) return null;

  return {
    latitude,
    longitude,
    // "India" is the one word every result here ends with, and none of them
    // needs. The pharmacy is in Indore; so is the customer.
    text: (body.formattedAddress ?? suggestion.title).replace(/,\s*India$/, ""),
  };
};

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
    return usingGooglePlaces
      ? await googleSearch(trimmed, signal)
      : await nominatimSearch(trimmed, signal);
  } catch {
    // Aborted by the next keystroke, or the network gave out. Either way the
    // box should stay usable and the customer can still type an address.
    return [];
  }
};

/** Coordinates for a chosen suggestion. Never throws. */
export const resolvePlace = async (
  suggestion: PlaceSuggestion,
  signal?: AbortSignal,
): Promise<ResolvedPlace | null> => {
  if (suggestion.latitude != null && suggestion.longitude != null) {
    return {
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      text: [suggestion.title, suggestion.subtitle].filter(Boolean).join(", "),
    };
  }

  try {
    return await googleResolve(suggestion, signal);
  } catch {
    return null;
  }
};
