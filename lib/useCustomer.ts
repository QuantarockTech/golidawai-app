import { useUser } from "@clerk/clerk-expo";
import { useCallback } from "react";

import { toE164 } from "@/lib/auth";

/**
 * Who is ordering, as the pharmacy needs to see them.
 *
 * WhatsApp shows the sender's own number, but that isn't always the number to
 * ring about the delivery — a son orders for his mother, a shared handset, a
 * number that doesn't take calls. So the message carries the number the
 * customer gave as well, rather than assuming the two match.
 *
 * The number is not always there to begin with. Signing up with email asks for
 * one, but signing in with Google never does — Clerk creates that account from
 * what Google returns, and Google does not return a phone number. Those
 * customers reach the ordering screens with nothing for the pharmacy to ring,
 * which is why `savePhone` exists and why sending is gated on the result.
 */
export const useCustomer = (): {
  name: string;
  phone: string;
  savePhone: (value: string) => Promise<boolean>;
} => {
  const { user } = useUser();

  const name =
    user?.fullName ||
    user?.firstName ||
    user?.emailAddresses[0]?.emailAddress ||
    "";

  // Sign-up stores the delivery number here; Clerk phone identifiers are paid.
  const phone =
    typeof user?.unsafeMetadata?.phone === "string"
      ? user.unsafeMetadata.phone
      : "";

  const savePhone = useCallback(
    async (value: string) => {
      if (!user) return false;

      try {
        await user.update({
          // Spread first: `unsafeMetadata` is replaced wholesale, not merged,
          // so writing the phone on its own would drop anything stored beside it.
          unsafeMetadata: { ...user.unsafeMetadata, phone: toE164(value) },
        });
        return true;
      } catch {
        return false;
      }
    },
    [user],
  );

  return { name, phone, savePhone };
};
