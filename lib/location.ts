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

/** A Google Maps pin the pharmacy can open straight from the WhatsApp message. */
export const mapsLink = (latitude: number, longitude: number): string =>
  `https://www.google.com/maps/search/?api=1&query=${latitude.toFixed(6)},${longitude.toFixed(6)}`;

/**
 * How close the embedded map sits. A block, roughly.
 *
 * Tight enough that the surrounding roads are named, wide enough that a fix a
 * hundred metres out is still on screen rather than off the edge of it.
 */
const EMBED_ZOOM = 16;

/**
 * The same pin, as a map that can be shown inside the app.
 *
 * `output=embed` is the one Google Maps view that frames without an API key:
 * it redirects to `/maps/embed` and answers with no `X-Frame-Options` and no
 * `frame-ancestors`, where the documented Maps Embed API returns 401 without a
 * key. That is the whole reason this app needs no mapping account.
 *
 * What it buys is Google's own labelling. The geocoders below can rarely name
 * a point in Indore better than its colony, but the customer looking at this
 * map can read the road names straight off it and confirm the pin is right —
 * which is the question actually being asked, and it needs no text answer.
 *
 * Display only. It is a cross-origin frame with no message channel, so nothing
 * can be read back out of it: the coordinates must already be known before it
 * is worth showing. See `mapsLink` for the version a rider taps to navigate.
 */
export const mapsEmbedUrl = (latitude: number, longitude: number): string =>
  `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}` +
  `&z=${EMBED_ZOOM}&output=embed`;

/**
 * The same map, wrapped in a page, for a WebView to load.
 *
 * Google refuses to render the embed as a top-level document — it answers
 * "the Google Maps Embed API must be used in an iframe" and nothing else. A
 * browser satisfies that by construction, because the web build puts the URL
 * in a real `<iframe>`. A WebView pointed straight at the URL does not: that
 * is a navigation, not a frame, so the phone showed the refusal text where the
 * map should have been.
 *
 * So the WebView is handed this document instead, and the iframe lives inside
 * it. The page is deliberately bare — no scripts, nothing to load, no styling
 * beyond filling the frame — because everything visible comes from Google.
 */
export const mapsEmbedHtml = (latitude: number, longitude: number): string =>
  `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: #f7fcfc; }
  iframe { display: block; border: 0; width: 100%; height: 100%; }
</style>
</head>
<body>
<iframe src="${mapsEmbedUrl(latitude, longitude)}" loading="lazy"></iframe>
</body>
</html>`;

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
 * The device's own geocoder on a phone, then OpenStreetMap in the browser. If
 * the best of those still only manages the city, the last step stops trying to
 * name the point and names its neighbour instead.
 *
 * Every route here is keyless, and every one of them reads OpenStreetMap in the
 * end — which across most of Indore draws the roads without naming them. So
 * this often falls all the way through to a landmark, and that is fine: the
 * text is a sanity check for the customer, not the thing the rider navigates
 * by. `mapsEmbedUrl` shows them Google's labels and `mapsLink` sends the rider
 * to the exact point, so nothing here is load-bearing for a delivery arriving.
 *
 * Callers must space repeated calls out: the free services allow about one
 * request a second.
 */
export const describeCoordinates = async (
  latitude: number,
  longitude: number,
): Promise<string> => {
  const Location = loadLocation();

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
