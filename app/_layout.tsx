import "@/global.css";
import { Poppins_400Regular } from "@expo-google-fonts/poppins/400Regular";
import { Poppins_500Medium } from "@expo-google-fonts/poppins/500Medium";
import { Poppins_600SemiBold } from "@expo-google-fonts/poppins/600SemiBold";
import { Poppins_700Bold } from "@expo-google-fonts/poppins/700Bold";
import { Raleway_700Bold } from "@expo-google-fonts/raleway/700Bold";
import { Raleway_800ExtraBold } from "@expo-google-fonts/raleway/800ExtraBold";
import { Roboto_400Regular } from "@expo-google-fonts/roboto/400Regular";
import { Roboto_500Medium } from "@expo-google-fonts/roboto/500Medium";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { PostHogErrorBoundary, PostHogProvider } from "posthog-react-native";
import { useCallback, useEffect, useRef, useState } from "react";

import BrandedSplash from "@/components/BrandedSplash";
import ErrorScreen from "@/components/ErrorScreen";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { CartProvider } from "@/contexts/CartContext";
import { CatalogueProvider } from "@/contexts/CatalogueContext";
import { DeliveryProvider } from "@/contexts/DeliveryContext";
import { OrderDraftProvider } from "@/contexts/OrderDraftContext";
import { OrderPrefsProvider } from "@/contexts/OrderPrefsContext";
import { OrdersProvider } from "@/contexts/OrdersContext";
import { PeopleProvider } from "@/contexts/PeopleContext";
import { posthog } from "@/lib/posthog";
import { setSupabaseTokenReader } from "@/lib/supabase";

SplashScreen.preventAutoHideAsync();

/*
 * How long the branded splash stays up at minimum, in ms.
 *
 * Without a floor a warm start flashes the logo for a frame or two, which reads
 * as a glitch rather than a brand. Short enough that a cold start, which takes
 * longer than this anyway, waits on nothing.
 */
const BRAND_SPLASH_MIN_MS = 900;

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}

function RootErrorFallback(props: { error?: unknown }) {
  return <ErrorScreen error={props?.error} />;
}

/*
 * Errors React never sees.
 *
 * An error boundary only catches what happens during render. A throw inside an
 * effect, a promise nobody awaited, or a module failing as it loads goes
 * straight past it to the runtime, which in a release build closes the app
 * without a word — the exact symptom that cost a wrong diagnosis and a rebuild.
 *
 * Held in module scope rather than a hook so it is installed as this file is
 * evaluated, which is before any screen has had the chance to fail.
 */
const globalErrors = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;

type ErrorUtilsLike = {
  getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
};

if (globalErrors?.setGlobalHandler) {
  const previous = globalErrors.getGlobalHandler?.();

  globalErrors.setGlobalHandler((error, isFatal) => {
    // Reported before anything else, so a crash that happens too early to
    // render still reaches somewhere it can be read.
    posthog?.capture("app_crashed", {
      message: error instanceof Error ? error.message : String(error),
      stack: (error instanceof Error && error.stack) || "",
      fatal: Boolean(isFatal),
    });

    previous?.(error, isFatal);
  });
}

function RootLayoutContent() {
  const { isLoaded: authLoaded, getToken } = useAuth();

  /*
   * Hands Supabase a way to ask Clerk for a fresh token.
   *
   * A reader rather than a token: Clerk's session tokens are short-lived and
   * refreshed behind the scenes, so anything captured once goes stale within
   * the minute. Cleared on unmount so a signed-out app cannot keep reading
   * with the last session it saw.
   */
  useEffect(() => {
    setSupabaseTokenReader(() => getToken());
    return () => setSupabaseTokenReader(null);
  }, [getToken]);
  const { user, isLoaded: userLoaded } = useUser();
  const { isLoaded: languageLoaded } = useLanguage();
  const identifiedUserId = useRef<string | null>(null);
  const [fontsLoaded] = useFonts({
    "sans-regular": require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
    "sans-bold": require("../assets/fonts/PlusJakartaSans-Bold.ttf"),
    "sans-medium": require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
    "sans-semibold": require("../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    "sans-extrabold": require("../assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
    "sans-light": require("../assets/fonts/PlusJakartaSans-Light.ttf"),
    // GoliDawayi brand type — mirrors golidawayi.com
    Raleway_700Bold,
    Raleway_800ExtraBold,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Roboto_400Regular,
    Roboto_500Medium,
    // Devanagari stack for Hindi — Poppins is the only loaded face that has it.
    Poppins_400Regular,
    Poppins_700Bold,
  });

  const [minSplashElapsed, setMinSplashElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinSplashElapsed(true), BRAND_SPLASH_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  /*
   * Hands the native splash over to our own the moment there is a frame to hand
   * it to. The branded splash is one image and waits on nothing, so this fires
   * long before fonts, auth or the language choice have landed — and because
   * both screens sit on the same white, the swap is invisible.
   */
  const handleSplashLayout = useCallback(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (!userLoaded) {
      return;
    }

    if (!user?.id) {
      identifiedUserId.current = null;
      return;
    }

    if (identifiedUserId.current === user.id) {
      return;
    }

    const personProperties = {
      ...(user.primaryEmailAddress?.emailAddress
        ? { email: user.primaryEmailAddress.emailAddress }
        : {}),
      ...(user.fullName ? { name: user.fullName } : {}),
    };

    posthog?.identify(user.id, personProperties);
    identifiedUserId.current = user.id;
  }, [user, userLoaded]);

  // Hold the app back until fonts, auth and the language choice are all ready —
  // rendering earlier would flash English before a Hindi user's saved choice loads.
  // The branded splash covers the wait instead of a blank screen.
  if (!fontsLoaded || !authLoaded || !languageLoaded || !minSplashElapsed) {
    return <BrandedSplash onLayout={handleSplashLayout} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const content = (
    <LanguageProvider>
      {/*
        Above the cart and the order history, because both name catalogue items
        and the reorder list has to look them up by id to offer them again.
      */}
      <CatalogueProvider>
        <CartProvider>
          <DeliveryProvider>
            <PeopleProvider>
            <OrderPrefsProvider>
              <OrderDraftProvider>
                <OrdersProvider>
                  <RootLayoutContent />
                </OrdersProvider>
              </OrderDraftProvider>
            </OrderPrefsProvider>
            </PeopleProvider>
          </DeliveryProvider>
        </CartProvider>
      </CatalogueProvider>
    </LanguageProvider>
  );

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      {posthog ? (
        <PostHogProvider client={posthog}>
          <PostHogErrorBoundary fallback={RootErrorFallback}>
            {content}
          </PostHogErrorBoundary>
        </PostHogProvider>
      ) : (
        content
      )}
    </ClerkProvider>
  );
}
