import { useAuth } from "@clerk/clerk-expo";
import { clsx } from "clsx";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter, type Href } from "expo-router";
import { styled } from "nativewind";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import BrandMark from "@/components/BrandMark";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";

// NativeWind only auto-handles React Native's own components; third-party ones
// need styled() or their className is dropped on native.
const SafeAreaView = styled(RNSafeAreaView);

const SIGN_IN_ROUTE = "/(auth)/sign-in" as Href;

// Straight from the concept board: linear-gradient(160deg, #0f5d61, #0b3f42).
// LinearGradient takes start/end points rather than an angle, so 160° is
// expressed as the vector it describes — mostly downward, leaning left.
const HERO_GRADIENT = ["#0f5d61", "#0b3f42"] as const;
const HERO_START = { x: 0.82, y: 0 } as const;
const HERO_END = { x: 0.18, y: 1 } as const;

/** Splash / Welcome — concept board frame 01. */
const Onboarding = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const { t, isHindi } = useLanguage();

  /*
   * Signing in with Google leaves the app here, and it used to stay here.
   *
   * The provider hands control back through the app's own scheme, which lands
   * on the root route. app/index.tsx decides where to go from there, and at
   * that instant Clerk has often not finished activating the session — so it
   * reads as signed out and sends the customer to this screen. Nothing then
   * moved them off it: this screen never asked who was signed in, so a
   * successful sign-in ended on the welcome screen it started from.
   *
   * Checked on every render rather than once, because the answer changes a
   * beat after arriving.
   */
  if (isLoaded && isSignedIn) return <Redirect href={"/(tabs)" as Href} />;

  return (
    <LinearGradient
      colors={HERO_GRADIENT}
      start={HERO_START}
      end={HERO_END}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1">
        <View className="ga-hero">

          <BrandMark variant="mark" tone="light" size={64} />

          {/* GoliDawayi is the brand name — it stays Latin in both languages. */}
          <Text className="ga-hero-wordmark">GoliDawayi</Text>

          <Text
            className={clsx(
              "ga-hero-tagline-hi",
              isHindi && "deva-tagline",
            )}
          >
            {t("splash.taglinePrimary")}
          </Text>
          <Text
            className={clsx("ga-hero-tagline-en", isHindi && "deva-tagline")}
          >
            {t("splash.taglineSecondary")}
          </Text>

          <Pressable
            className="ga-hero-btn"
            onPress={() => router.push(SIGN_IN_ROUTE)}
            accessibilityRole="button"
          >
            <Text className="ga-hero-btn-text">{t("splash.getStarted")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/*
       * The board puts the language choice ahead of sign-in on purpose: someone
       * who reads only Hindi needs it before the first form. Outside the
       * SafeAreaView so the top inset isn't applied twice — it positions itself
       * off the live inset instead.
       */}
      <LanguageToggle tone="dark" floating />
    </LinearGradient>
  );
};

export default Onboarding;
