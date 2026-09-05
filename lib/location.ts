import { Platform } from "react-native";

/*
 * Loaded lazily rather than imported at the top, for the same reason
 * expo-image-picker is on the prescription screen: it is a native module, so it
 * only exists in a build made after the package was added. A static import
 * takes the whole screen down in an older development build, and the manual
 * address field — which needs nothing native — would go down with it.
 */
type LocationModule = typeof import("expo-location");

const loadLocation = (): LocationModule | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-location") as LocationModule;
  } catch {
    return null;
  }
};

export type LocateFailure =
  | "unavailable"
  | "denied"
  | "failed"
  | "timeout"
  /** The device cannot locate itself — Location Services off, most often. */
  | "positionUnavailable";

/**
 * A success always carries coordinates — that is the whole point of asking the
 * device — so they are required here even though they are optional on a stored
 * address, which may have been typed by hand instead.
 */
type LocatedAddress = DeliveryAddress & { latitude: number; longitude: number };

export type LocateResult =
  | { ok: true; address: LocatedAddress }
  | { ok: false; reason: LocateFailure };

/**
 * How wide a fix may be before the address it resolves to stops being one.
 *
 * A hundred-odd metres in Indore is the difference between a house and the
 * ward it sits in, and reverse geocoding does not report that doubt — it
 * answers a vague point with a confident, useless line like "Indore City,
 * Madhya Pradesh". Anything wider than this is treated as a neighbourhood
 * hint, never as somewhere a rider could be sent.
 */
export const COARSE_FIX_METRES = 150;

/** Whether a fix is too wide to describe a doorstep. Unknown counts as fine. */
export const isCoarseFix = (accuracy?: number): boolean =>
  accuracy != null && accuracy > COARSE_FIX_METRES;

/**
 * Indore, near Rajwada. Where a map opens when nothing better is known yet.
 *
 * Every order this app takes is a local one, so starting the customer in the
 * middle of their own city is a shorter drag than starting them nowhere.
 */
export const DEFAULT_CENTRE = { latitude: 22.7196, longitude: 75.8577 };

/** A Google Maps pin the pharmacy can open straight from the WhatsApp message. */
export const mapsLink = (latitude: number, longitude: number): string =>
  `https://www.google.com/maps/search/?api=1&query=${latitude.toFixed(6)},${longitude.toFixed(6)}`;

/**
 * Joins address fields, widest last, into one readable line.
 *
 * Reverse geocoding returns fields that are frequently empty or duplicated in
 * India — a building name and the street often hold the same thing — so this
 * de-duplicates rather than joining blindly.
 */
const joinParts = (ordered: (string | null | undefined)[]): string => {
  const seen = new Set<string>();
  const kept: string[] = [];

  for (const part of ordered) {
    const value = part?.trim();
    if (!value || seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    kept.push(value);
  }

  return kept.join(", ");
};

const describeNative = async (
  Location: LocationModule,
  latitude: number,
  longitude: number,
): Promise<string> => {
  const [parts] = await Location.reverseGeocodeAsync({ latitude, longitude });
  if (!parts) return "";

  return joinParts([
    parts.name,
    parts.street,
    parts.district,
    parts.subregion,
    parts.city,
    parts.region,
    parts.postalCode,
  ]);
};

/**
 * The slice of Nominatim's `addressdetails` payload that we read.
 *
 * Wider than it looks like it needs to be, because Indian addresses land in
 * fields a European one never uses. A colony comes back under `residential`,
 * not `road`; a sector or block under `quarter` or `city_block`; and plenty of
 * points have no numbered street at all. Reading only house/road/suburb threw
 * away the useful half — "Sudama Nagar Sector D" is in `residential`, and
 * skipping it leaves nothing but the district and the city.
 */
type NominatimAddress = Partial<
  Record<
    | "amenity"
    | "building"
    | "shop"
    | "house_name"
    | "house_number"
    | "road"
    | "residential"
    | "neighbourhood"
    | "quarter"
    | "city_block"
    | "suburb"
    | "city_district"
    | "city"
    | "town"
    | "village"
    | "state"
    | "postcode",
    string
  >
>;

const NOMINATIM_TIMEOUT_MS = 8000;

/**
 * Reverse geocoding over HTTP, for the browser.
 *
 * `expo-location` only geocodes on Android and iOS, so the web build has to ask
 * someone. Nominatim is OpenStreetMap's own service: no key, no billing, and
 * CORS-open, which matters because this runs from the customer's browser. Its
 * usage policy caps callers at one request a second and asks that they identify
 * themselves — both hold here, since this fires only when someone taps "use my
 * current location" and the browser sends a Referer of its own accord.
 *
 * Country is deliberately dropped: every order is an Indore one, so "India" is
 * a word the customer has to read past to reach their own street.
 */
const describeOverHttp = async (
  latitude: number,
  longitude: number,
): Promise<string> => {
  const url =
    "https://nominatim.openstreetmap.org/reverse?format=jsonv2" +
    `&addressdetails=1&zoom=18&accept-language=en&lat=${latitude}&lon=${longitude}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "GoliDawayi" },
    });
    if (!response.ok) return "";

    const body = (await response.json()) as { address?: NominatimAddress };
    const parts = body.address;
    if (!parts) return "";

    const houseAndRoad = [parts.house_number, parts.road]
      .filter(Boolean)
      .join(" ");

    const city = parts.city ?? parts.town ?? parts.village;

    /*
     * "Indore City, Indore" is one place said twice — an OSM administrative
     * division that repeats the city it divides. The de-duplication below
     * cannot see it, because the two strings genuinely differ.
     */
    const district =
      city && parts.city_district?.toLowerCase().includes(city.toLowerCase())
        ? undefined
        : parts.city_district;

    return joinParts([
      parts.house_name ?? parts.building ?? parts.amenity ?? parts.shop,
      houseAndRoad,
      parts.residential,
      parts.city_block,
      parts.quarter,
      parts.neighbourhood,
      parts.suburb,
      district,
      city,
      parts.state,
      parts.postcode,
    ]);
  } finally {
    clearTimeout(timer);
  }
};

const OLA_KEY = process.env.EXPO_PUBLIC_OLA_MAPS_KEY;

/**
 * Reverse geocoding through Ola Maps, when a key is configured.
 *
 * Tried ahead of Google for two reasons. It is built in India off Ola's own
 * fleet traces, so it names the colonies and unnumbered roads that Indore is
 * actually made of — the same gap that leaves OpenStreetMap returning nothing
 * but "Indore City" here. And its free allowance is 100,000 calls a month with
 * no card on file, where Google refuses every request until a Cloud project has
 * billing enabled.
 *
 * `api.olamaps.io` answers with `access-control-allow-origin: *`, so this runs
 * from the browser as well as from a phone.
 *
 * The response is shaped after Google's — `results[]` carrying
 * `formatted_address` — but the status field is not: Ola spells success `ok`
 * where Google spells it `OK`. Both are accepted below rather than guessed at,
 * and a payload that matches neither simply falls through to the next route.
 */
const describeViaOla = async (
  latitude: number,
  longitude: number,
): Promise<string> => {
  const url =
    "https://api.olamaps.io/places/v1/reverse-geocode" +
    `?latlng=${latitude},${longitude}&api_key=${OLA_KEY}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    /*
     * Loud for the same reason the Google path is: a key that is present and
     * refused (401 for a bad key, 429 once the free allowance is spent) lands
     * in exactly the same silent fallback as no key at all, and the screen
     * cannot tell the developer which of the two just happened.
     */
    if (!response.ok) {
      if (__DEV__) {
        console.warn(
          `[location] Ola Maps refused: HTTP ${response.status}. ` +
            "Falling back to the next geocoder.",
        );
      }
      return "";
    }

    const body = (await response.json()) as {
      status?: string;
      results?: { formatted_address?: string }[];
    };

    if (body.status && body.status.toLowerCase() !== "ok") return "";

    const line = body.results?.find(
      (result) => result.formatted_address,
    )?.formatted_address;

    // Country dropped, pincode kept — every order here is an Indore one, so
    // "India" is a word to read past, but the six digits genuinely help a rider.
    return line ? line.replace(/,\s*India$/, "") : "";
  } finally {
    clearTimeout(timer);
  }
};

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY;

/**
 * Reverse geocoding through Google, when a key is configured.
 *
 * Worth the key for one reason: Google has named the roads OpenStreetMap has
 * not. A pin on a real Indore street can come back from OSM as nothing but the
 * district, because the road is drawn but never labelled — the geometry is
 * there, the name never was. Google has both.
 *
 * `maps.googleapis.com` answers with `access-control-allow-origin: *`, so this
 * runs from the browser as well as from a phone.
 */
const describeViaGoogle = async (
  latitude: number,
  longitude: number,
): Promise<string> => {
  const url =
    "https://maps.googleapis.com/maps/api/geocode/json" +
    `?latlng=${latitude},${longitude}&language=en&key=${GOOGLE_KEY}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return "";

    const body = (await response.json()) as {
      status?: string;
      error_message?: string;
      results?: { formatted_address?: string; types?: string[] }[];
    };

    /*
     * A rejected key is the one failure that has to be loud.
     *
     * Every other route in this file degrades quietly on purpose, and that is
     * right in front of a customer. But a key that is present and refused —
     * Geocoding API not enabled, or an HTTP referrer restriction that does not
     * cover this origin — produces REQUEST_DENIED, which lands in exactly the
     * same silent fallback as having configured no key at all. The two are
     * indistinguishable from the screen, so the developer who just added the
     * key has no way to tell whether it took effect.
     */
    if (body.status !== "OK") {
      if (__DEV__) {
        console.warn(
          `[location] Google geocoding refused: ${body.status}` +
            `${body.error_message ? ` — ${body.error_message}` : ""}. ` +
            "Falling back to OpenStreetMap, which does not name most Indore " +
            "roads. Check that the Geocoding API is enabled and that the key's " +
            "referrer restrictions allow this origin.",
        );
      }
      return "";
    }

    /*
     * Results run most specific first, so the head of the list is usually the
     * street address. Usually — where Google has no street address for a point
     * it leads with a Plus Code instead, and "6MPQ+2C Indore" is a worse thing
     * to read down a phone line than the landmark fallback below. Skip those
     * and take the first result that names somewhere a person could say aloud.
     */
    const usable = body.results?.find(
      (result) =>
        result.formatted_address && !result.types?.includes("plus_code"),
    );

    const line = usable?.formatted_address;
    return line ? line.replace(/,\s*India$/, "") : "";
  } finally {
    clearTimeout(timer);
  }
};

/** Roughly a two-minute walk — close enough that "near" is still true. */
const LANDMARK_RADIUS_M = 250;

/**
 * The nearest named thing, for when no address can be had.
 *
 * This is how addresses work here anyway. A rider told "near Gehm Clinic" gets
 * there; one told "Indore, Madhya Pradesh" does not. Overpass reads the same
 * OpenStreetMap data as the geocoder, but asks a different question — not
 * "what is this point called", which for an unnamed road is nothing, but "what
 * around here has a name at all".
 *
 * Amenities only, and deliberately so: a clinic, a school or a temple is
 * something a stranger can find and a local already knows. A named driveway is
 * neither.
 */
/**
 * Named, but no use as a landmark. "Near Swachh Bharat Mission" is a public
 * toilet, and nobody has ever given directions by one.
 */
const POOR_LANDMARKS = new Set([
  "toilets",
  "waste_basket",
  "waste_disposal",
  "bench",
  "drinking_water",
  "bicycle_parking",
  "parking_space",
  "shelter",
]);

const nearestLandmark = async (
  latitude: number,
  longitude: number,
): Promise<string> => {
  const query =
    `[out:json][timeout:15];nwr(around:${LANDMARK_RADIUS_M},${latitude},${longitude})` +
    `["name"]["amenity"];out center 20;`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
      {
        signal: controller.signal,
        // Overpass answers 406 to a request with no User-Agent. Browsers always
        // send one; this is here for the native build, which may not.
        headers: { Accept: "application/json", "User-Agent": "GoliDawayi" },
      },
    );
    if (!response.ok) return "";

    const body = (await response.json()) as {
      elements?: {
        lat?: number;
        lon?: number;
        center?: { lat?: number; lon?: number };
        tags?: { name?: string; amenity?: string };
      }[];
    };

    /*
     * Overpass returns matches in its own order, not by distance, so the
     * closest has to be picked here. Degrees are good enough to rank by over a
     * couple of hundred metres — the longitude squeeze at this latitude is
     * about 8%, nowhere near enough to reorder a list this short.
     */
    let closest = "";
    let best = Infinity;

    for (const element of body.elements ?? []) {
      const name = element.tags?.name?.trim();
      const amenity = element.tags?.amenity;
      if (!name || (amenity && POOR_LANDMARKS.has(amenity))) continue;

      const lat = element.lat ?? element.center?.lat;
      const lon = element.lon ?? element.center?.lon;
      if (lat == null || lon == null) continue;

      const distance = (lat - latitude) ** 2 + (lon - longitude) ** 2;
      if (distance < best) {
        best = distance;
        closest = name;
      }
    }

    return closest;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * True when a geocoded line names an administrative area and nothing else.
 *
 * "Indore, Madhya Pradesh, 452001" is three words for a city of three million.
 * It is not wrong, which is what makes it dangerous — it reads like an address
 * while naming nothing anyone could drive to. Two parts or fewer before the
 * state is the tell.
 */
const isTooBroad = (line: string): boolean =>
  line
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean).length <= 3;

/**
 * Names the place at a set of coordinates, by whatever route works.
 *
 * In order of how much it can tell you: Ola Maps then Google, each if a key is
 * configured, the device's own geocoder on a phone, then OpenStreetMap. If the
 * best of those still only manages the city, the last step stops trying to name
 * the point and names its neighbour instead.
 *
 * Ola leads because it is the one route that is both free without a card and
 * built on Indian address data. Every keyless service in this chain reads the
 * same OpenStreetMap that leaves most of Indore's roads unnamed, which is why
 * an unconfigured app falls all the way through to a landmark.
 *
 * Callers that geocode repeatedly, such as a map the customer is dragging, must
 * space their calls out: the free services allow about one request a second.
 */
export const describeCoordinates = async (
  latitude: number,
  longitude: number,
): Promise<string> => {
  const Location = loadLocation();

  if (OLA_KEY) {
    try {
      const ola = await describeViaOla(latitude, longitude);
      if (ola) return ola;
    } catch {
      // Quota, a bad key, a network that went away. The routes below remain.
    }
  }

  if (GOOGLE_KEY) {
    try {
      const google = await describeViaGoogle(latitude, longitude);
      if (google) return google;
    } catch {
      // Billing, quota, a bad key. The free routes below still work.
    }
  }

  let best = "";

  if (Location && Platform.OS !== "web") {
    try {
      best = await describeNative(Location, latitude, longitude);
    } catch {
      // Fall through to the network lookup below.
    }
  }

  if (!best) {
    try {
      best = await describeOverHttp(latitude, longitude);
    } catch {
      // Geocoding is a lookup over the network and fails on its own terms.
      // The coordinates are already good, so keep them rather than give up.
    }
  }

  if (best && !isTooBroad(best)) return best;

  try {
    const landmark = await nearestLandmark(latitude, longitude);
    if (landmark) return best ? `Near ${landmark} — ${best}` : `Near ${landmark}`;
  } catch {
    // No landmark either. Whatever the geocoder managed is still better than
    // an empty box, and the map and coordinates are doing the real work.
  }

  return best;
};

/**
 * How long one attempt at a fix may run.
 *
 * Nothing in the geolocation stack gives up on its own. `LocationOptions` has
 * no timeout on native, and the web implementation hands the browser a set of
 * options whose `timeout` defaults to `Infinity` — so a request for precision
 * that the hardware cannot satisfy does not fail, it simply never answers, and
 * the button spins until the customer gives up on us.
 */
const PRECISE_TIMEOUT_MS = 8_000;
const COARSE_TIMEOUT_MS = 6_000;

/** Long, because a person has to notice a prompt and reach for "Allow". */
const PERMISSION_TIMEOUT_MS = 25_000;

const TIMED_OUT = Symbol("timed out");

const withDeadline = async <T>(
  work: Promise<T>,
  ms: number,
): Promise<T | typeof TIMED_OUT> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<typeof TIMED_OUT>((resolve) => {
        timer = setTimeout(() => resolve(TIMED_OUT), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

/** One attempt at a fix, at one accuracy, that is guaranteed to come back. */
const fixAt = async (
  Location: LocationModule,
  accuracy: import("expo-location").LocationAccuracy,
  ms: number,
  maximumAge: number,
): Promise<import("expo-location").LocationObject | null> => {
  /*
   * Neither key belongs to `LocationOptions`, but the web implementation
   * spreads whatever it is given straight into `navigator.geolocation`, and
   * both of its own defaults there are wrong for us.
   *
   * `timeout` it leaves unset, so the browser's own default is `Infinity` and
   * a request the hardware cannot satisfy never fails — it just never answers.
   *
   * `maximumAge` it sets to `Infinity`, which tells the browser that a cached
   * position of any age will do. That is how a stale, coarse fix — the kind a
   * laptop gets from its IP address — comes back instantly and confidently
   * long after the machine could have measured something far better. Asking
   * for zero forces an actual reading.
   */
  const options: import("expo-location").LocationOptions & {
    timeout?: number;
    maximumAge?: number;
  } = { accuracy };


  try {
    const position = await withDeadline(
      Location.getCurrentPositionAsync(options),
      // A moment past the browser's own deadline, so its error path wins the
      // race where it can and this is only the backstop for native.
      ms + 1000,
    );

    return position === TIMED_OUT ? null : position;
  } catch {
    // A refusal or a hardware failure. Either way, try something cheaper.
    return null;
  }
};

/**
 * Finds where the device is, as precisely as this matters.
 *
 * Three attempts, cheapest first. A recent cached fix costs nothing. Failing
 * that, `Accuracy.High` — a hundred metres is fine for "which city" and
 * hopeless for "which house".
 *
 * The last step is the one that matters for whoever is on a laptop. Asking for
 * precision is exactly what stalls: it tells the browser to hold out for a GPS
 * chip that a desktop does not have, and pushes a phone to keep the radio open
 * indoors where it will not get a lock either. A coarse fix comes back off
 * Wi-Fi almost at once. It is only ever a neighbourhood — the screen says so,
 * and the map is there to be dragged — but a rough answer now beats a precise
 * one that never arrives.
 */
const readPosition = async (
  Location: LocationModule,
): Promise<import("expo-location").LocationObject | null> => {
  try {
    const cached = await Location.getLastKnownPositionAsync({
      maxAge: 60_000,
      requiredAccuracy: COARSE_FIX_METRES,
    });
    if (cached) return cached;
  } catch {
    // Not every platform keeps one. Fall through and ask properly.
  }

  // Nothing cached will do for this one: the whole point is to make the
  // machine take a reading rather than repeat one it has lying around.
  const precise = await fixAt(
    Location,
    Location.Accuracy.High,
    PRECISE_TIMEOUT_MS,
    0,
  );
  if (precise) return precise;

  // Precision has already been given up on, so a fix from the last minute is
  // worth more than another wait for one that will be no better.
  return fixAt(
    Location,
    Location.Accuracy.Balanced,
    COARSE_TIMEOUT_MS,
    60_000,
  );
};

/* What `navigator.geolocation` hands back, without needing the DOM lib. */
type WebFix = {
  coords: { latitude: number; longitude: number; accuracy?: number };
};
type WebError = { code: number };

/** The three codes the Geolocation API defines, spelled out. */
const DENIED = 1;
const POSITION_UNAVAILABLE = 2;

const webAttempt = (options: {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
}): Promise<WebFix | WebError> =>
  new Promise((resolve) => {
    // Both callbacks resolve: the error is information, not an exception, and
    // which one came back decides whether a second attempt is worth making.
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position as WebFix),
      (error) => resolve(error as WebError),
      options,
    );
  });

/**
 * The browser's own geolocation, driven directly.
 *
 * `expo-location` is skipped here rather than configured. Its web layer is a
 * thin wrapper whose defaults actively work against us — `maximumAge:
 * Infinity`, so a stale fix is served instead of a reading; no `timeout`, so a
 * request that cannot be satisfied never answers; and a permission check that
 * is itself an untimed position request. Wrapping that in deadlines produced a
 * spinner that either lied or hung. `navigator.geolocation` is the entire API
 * underneath, and calling it directly means every option is ours and the error
 * says which of three quite different things went wrong.
 *
 * Two attempts. The first insists on precision and a fresh reading, and is
 * given long enough for a Wi-Fi scan to finish — that is the one that produces
 * a street on a laptop. The second settles for whatever is quick.
 */
const locateOnWeb = async (): Promise<LocateResult> => {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { ok: false, reason: "unavailable" };
  }

  const attempts = [
    { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    { enableHighAccuracy: false, timeout: 8_000, maximumAge: 60_000 },
  ];

  let last: WebError | null = null;

  for (const options of attempts) {
    const result = await webAttempt(options);

    if ("coords" in result) {
      const { latitude, longitude, accuracy } = result.coords;

      return {
        ok: true,
        address: {
          text: await describeCoordinates(latitude, longitude),
          latitude,
          longitude,
          ...(accuracy != null ? { accuracy } : {}),
          source: "gps",
          savedAt: new Date().toISOString(),
        },
      };
    }

    last = result;
    // A refusal is final. Asking again only prompts the customer twice.
    if (result.code === DENIED) break;
  }

  if (last?.code === DENIED) return { ok: false, reason: "denied" };

  /*
   * Told apart on purpose. "Unavailable" means the machine has no way to
   * locate itself at all — Location Services switched off for the browser,
   * most often — and no amount of waiting will change that, so the advice has
   * to be different from "it is taking a while".
   */
  if (last?.code === POSITION_UNAVAILABLE) {
    return { ok: false, reason: "positionUnavailable" };
  }

  return { ok: false, reason: "timeout" };
};

/** Reads the device's current position and describes it as an address. */
export const locateCurrentAddress = async (): Promise<LocateResult> => {
  if (Platform.OS === "web") return locateOnWeb();

  const Location = loadLocation();
  if (!Location) return { ok: false, reason: "unavailable" };

  try {
    /*
     * Guarded too. On web this call is itself a `getCurrentPosition` with no
     * options at all, so an unanswered browser prompt hangs here — before any
     * of the deadlines below ever get a chance to run.
     */
    const permission = await withDeadline(
      Location.requestForegroundPermissionsAsync(),
      PERMISSION_TIMEOUT_MS,
    );
    if (permission === TIMED_OUT) return { ok: false, reason: "timeout" };
    if (!permission.granted) return { ok: false, reason: "denied" };

    const position = await readPosition(Location);
    if (!position) return { ok: false, reason: "timeout" };

    const { latitude, longitude, accuracy } = position.coords;

    const text = await describeCoordinates(latitude, longitude);

    return {
      ok: true,
      address: {
        text,
        latitude,
        longitude,
        ...(accuracy != null ? { accuracy } : {}),
        source: "gps",
        savedAt: new Date().toISOString(),
      },
    };
  } catch {
    return { ok: false, reason: "failed" };
  }
};
