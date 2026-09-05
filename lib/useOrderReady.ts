import { useRouter } from "expo-router";
import { useCallback } from "react";

import { useDelivery } from "@/contexts/DeliveryContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { notify } from "@/lib/dialog";
import { useCustomer } from "@/lib/useCustomer";

/**
 * The two things an order cannot leave without.
 *
 * Somewhere to send it, and a number to ring when the rider cannot find the
 * door — which in Indore is most deliveries. Neither is optional, and neither
 * can be chased afterwards: the message lands in a WhatsApp thread that the
 * pharmacy reads once, and a missing number turns into a lost order rather than
 * a phone call.
 *
 * Shared rather than repeated at each send button, so the three ordering
 * screens cannot drift apart on what counts as ready.
 */
export const useOrderReady = () => {
  const { address } = useDelivery();
  const { phone } = useCustomer();
  const { t } = useLanguage();
  const router = useRouter();

  /**
   * Returns false and puts the customer where they can fix it. `title` is the
   * calling screen's own heading, so the alert reads as part of that screen.
   */
  return useCallback(
    (title: string): boolean => {
      const missing = !address
        ? "address.requiredBeforeSend"
        : !phone
          ? "address.phoneRequiredBeforeSend"
          : null;

      if (!missing) return true;

      notify(title, t(missing), t("common.ok"));
      router.push("/delivery-address");
      return false;
    },
    [address, phone, router, t],
  );
};
