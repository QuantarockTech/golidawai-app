/**
 * Identifier helpers for the auth flow.
 *
 * Email is the login credential; the mobile number is collected for delivery
 * and stored as user metadata, so it still needs validating and normalising to
 * E.164 even though Clerk never sees it as an identifier.
 */

const DEFAULT_COUNTRY_CODE = "+91";

export const isEmailLike = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const isPhoneLike = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.includes("@")) return false;
  return /^\+?[\d\s-]{7,}$/.test(trimmed);
};

/** Strips spaces/dashes and adds the default country code to a bare number. */
export const toE164 = (value: string): string => {
  const cleaned = value.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.length === 10) return `${DEFAULT_COUNTRY_CODE}${cleaned}`;
  return cleaned.length > 0 ? `+${cleaned}` : cleaned;
};

/** Splits "Aditi Sharma" into the first/last name Clerk stores separately. */
export const splitFullName = (
  fullName: string,
): { firstName: string; lastName?: string } => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const [firstName, ...rest] = parts;
  return {
    firstName: firstName ?? "",
    ...(rest.length > 0 ? { lastName: rest.join(" ") } : {}),
  };
};

export const readErrorMessage = (error: unknown, fallback: string): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "errors" in error &&
    Array.isArray((error as { errors?: unknown[] }).errors)
  ) {
    const [first] = (error as { errors: { longMessage?: string; message?: string }[] })
      .errors;
    if (first?.longMessage || first?.message) {
      return first.longMessage ?? first.message ?? fallback;
    }
  }
  return error instanceof Error ? error.message : fallback;
};
