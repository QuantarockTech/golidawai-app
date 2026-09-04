import { useRouter } from "expo-router";
import { useCallback } from "react";

/**
 * Back, with somewhere to land.
 *
 * `router.back()` is a silent no-op when nothing is on the stack, and on the
 * web that is the normal state: a screen opened from a typed URL, a shared
 * link, or a plain page reload starts with no history of its own. The arrow
 * then looks broken. Falling through to the dashboard means the control always
 * does something, and on native — where there is virtually always a stack —
 * nothing changes.
 */
export const useGoBack = () => {
  const router = useRouter();

  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)");
  }, [router]);
};
