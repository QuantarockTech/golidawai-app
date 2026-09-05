/**
 * Prescription image hosting.
 *
 * A WhatsApp deep link carries text and nothing else, so a photo has to already
 * live at a URL before it can reach the pharmacy. With no backend of our own,
 * ImgBB stores the file and hands back a link the message can carry.
 *
 * Every upload is given an expiry, and that is deliberate. A prescription is
 * health data, the link is unauthenticated, and a WhatsApp message gets
 * forwarded — so the window in which that link still opens is the only privacy
 * control available without a server. ImgBB deletes the file at source when it
 * lapses, which turns an indefinite leak into a bounded one.
 */

const ENDPOINT = "https://api.imgbb.com/1/upload";

/**
 * How long a prescription link keeps working.
 *
 * Thirty days rather than the week this started at. A week covered filling the
 * order and little else — a repeat prescription, a query raised a fortnight
 * later, or a customer scrolling back through their own WhatsApp thread all
 * found a dead link. A month covers the refill cycle these orders actually run
 * on.
 *
 * It is still deliberately finite. The link is unauthenticated and a WhatsApp
 * message gets forwarded, so this window is the only privacy control available
 * without a server: ImgBB deletes the file at source when it lapses, which
 * turns an indefinite leak into a bounded one. Raising it trades one against
 * the other, so raise it for a reason rather than by default.
 *
 * ImgBB accepts 60 to 15,552,000 seconds, so 180 days is the hard ceiling.
 */
export const LINK_LIFETIME_DAYS = 30;

const LINK_LIFETIME_SECONDS = LINK_LIFETIME_DAYS * 24 * 60 * 60;

/** A slow network shouldn't leave the send button spinning forever. */
const TIMEOUT_MS = 45_000;

/*
 * Public by necessity: there is no server to keep it behind, so this key ships
 * inside the app and the web bundle. It is an upload-only key for a throwaway
 * image host, which is the trade the no-backend constraint forces. Restrict it
 * in the ImgBB dashboard rather than treating it as a secret.
 */
const API_KEY = process.env.EXPO_PUBLIC_IMGBB_API_KEY ?? "";

/** False when the key is missing, so screens can say so instead of failing. */
export const canUploadImages = (): boolean => API_KEY.length > 0;

type ImgbbResponse = {
  success?: boolean;
  data?: { url?: string; display_url?: string };
  error?: { message?: string };
};

/**
 * Uploads one photo and returns its direct link.
 *
 * Takes base64 rather than a file URI because that is the one shape that works
 * the same on Android, iOS and web — `expo-image-picker` can hand it to us
 * directly, and it avoids the platform differences in turning a local URI into
 * something `FormData` will accept.
 */
export const uploadPrescriptionImage = async (
  base64: string,
): Promise<string> => {
  if (!API_KEY) throw new Error("missing-key");

  const body = new FormData();
  body.append("image", base64);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      `${ENDPOINT}?key=${API_KEY}&expiration=${LINK_LIFETIME_SECONDS}`,
      { method: "POST", body, signal: controller.signal },
    );

    const payload = (await response.json()) as ImgbbResponse;
    const url = payload.data?.url ?? payload.data?.display_url;

    if (!response.ok || !payload.success || !url) {
      throw new Error(payload.error?.message ?? "upload-failed");
    }

    return url;
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Uploads photos one after another rather than in parallel.
 *
 * Five full-size photos over a phone connection is enough to have them starve
 * each other and time out together; in sequence, each either lands or fails on
 * its own, and a partial result is still worth sending.
 */
export const uploadPrescriptionImages = async (
  images: string[],
): Promise<{ urls: string[]; failed: number }> => {
  const urls: string[] = [];
  let failed = 0;

  for (const base64 of images) {
    try {
      urls.push(await uploadPrescriptionImage(base64));
    } catch {
      failed += 1;
    }
  }

  return { urls, failed };
};
