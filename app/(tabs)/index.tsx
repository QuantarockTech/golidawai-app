import { useUser } from "@clerk/clerk-expo";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type Href } from "expo-router";
import { styled } from "nativewind";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import CallToOrderBanner from "@/components/CallToOrderBanner";
import LanguageToggle from "@/components/LanguageToggle";
import QuickActionTile from "@/components/QuickActionTile";
import ReorderList from "@/components/ReorderList";
import WhatsAppFab from "@/components/WhatsAppFab";
import { QUICK_ACTIONS } from "@/constants/data";
import { colors } from "@/constants/theme";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/global.css";
import type { TranslationKey } from "@/lib/i18n/translations";
import { notify } from "@/lib/dialog";
import { pressRow, pressSmall } from "@/lib/press";
import { useReorder } from "@/lib/useReorder";

// NativeWind only auto-handles React Native's own components; third-party ones
// need styled() or their className is dropped on native.
const SafeAreaView = styled(RNSafeAreaView);

// Runs the brand gradient across rather than down, so it reads as the same
// family as the splash hero without repeating it.
const PROMO_GRADIENT = [colors.brandDark, colors.brand] as const;

const ACTION_LABEL_KEYS: Record<QuickActionKey, TranslationKey> = {
  uploadRx: "home.action.uploadRx",
  orderMedicine: "home.action.orderMedicine",
  ambulance: "home.action.ambulance",
  doctorConsult: "home.action.doctorConsult",
  labTests: "home.action.labTests",
  insurance: "home.action.insurance",
};

const greetingKey = (hour: number): TranslationKey => {
  if (hour < 12) return "home.goodMorning";
  if (hour < 17) return "home.goodAfternoon";
  return "home.goodEvening";
};

/** Home dashboard — concept board frame 04. */
export default function Home() {
  const { user } = useUser();
  const { t } = useLanguage();
  const { itemCount } = useCart();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const { entries, fromHistory } = useReorder();

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) =>
      entry.name.toLowerCase().includes(needle),
    );
  }, [entries, query]);

  /** Anything with no screen of its own yet, e.g. notifications. */
  const comingSoon = (feature: string) => {
    notify(
      t("home.comingSoonTitle"),
      t("home.comingSoonBody", { feature }),
      t("common.ok"),
    );
  };

  /*
   * Board frames 05-07 have their own screens. Doctor Consult, Lab Tests and
   * Insurance have no board design, so they share one callback screen keyed by
   * route param rather than three invented flows.
   */
  const QUICK_ACTION_ROUTES: Record<QuickActionKey, Href> = {
    uploadRx: "/upload-prescription",
    orderMedicine: "/order-medicines",
    ambulance: "/ambulance",
    doctorConsult: "/service/doctorConsult",
    labTests: "/service/labTests",
    insurance: "/service/insurance",
  };

  const displayName =
    user?.firstName ||
    user?.fullName ||
    user?.emailAddresses[0]?.emailAddress ||
    "";
  const initial = (displayName.trim()[0] ?? "G").toUpperCase();

  return (
    <View className="gd-screen">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gd-scroll-content"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gd-greet-row">
            <View className="gd-avatar">
              <Text className="gd-avatar-text">{initial}</Text>
            </View>

            <View className="min-w-0 flex-1">
              <Text className="gd-greet-hello">
                {t(greetingKey(dayjs().hour()))}
              </Text>
              <Text className="gd-greet-name" numberOfLines={1}>
                {displayName}
              </Text>
            </View>

            <LanguageToggle />

            <Pressable
              className="gd-icon-btn"
              style={pressSmall}
              onPress={() => comingSoon(t("home.notifications"))}
              accessibilityRole="button"
              accessibilityLabel={t("home.notifications")}
              hitSlop={6}
            >
              <MaterialCommunityIcons
                name="bell-outline"
                size={22}
                color={colors.ink}
              />
            </Pressable>
          </View>

          {/*
           * Filters the medicine list below as you type. No backend needed —
           * it searches what's already on the screen, which is honest and
           * immediately useful, and becomes a server query later.
           */}
          <View className="gd-search">
            <MaterialCommunityIcons
              name="magnify"
              size={18}
              color={colors.inkFaint}
            />
            <TextInput
              className="gd-search-input"
              value={query}
              onChangeText={setQuery}
              placeholder={t("home.searchPlaceholder")}
              placeholderTextColor={colors.inkFaint}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel={t("home.searchPlaceholder")}
            />
            {query.length > 0 ? (
              <Pressable
                style={pressSmall}
                onPress={() => setQuery("")}
                accessibilityRole="button"
                accessibilityLabel={t("home.clearSearch")}
                hitSlop={8}
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={18}
                  color={colors.inkFaint}
                />
              </Pressable>
            ) : null}
          </View>

          <LinearGradient
            colors={PROMO_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="gd-promo"
          >
            <Text className="gd-promo-title">{t("home.promoTitle")}</Text>
            <Text className="gd-promo-body">{t("home.promoBody")}</Text>
          </LinearGradient>

          <Text className="gd-section-title">{t("home.whatDoYouNeed")}</Text>
          <View className="gd-grid">
            {QUICK_ACTIONS.map((action) => (
              <QuickActionTile
                key={action.key}
                icon={action.icon}
                tone={action.tone}
                label={t(ACTION_LABEL_KEYS[action.key])}
                onPress={() => router.push(QUICK_ACTION_ROUTES[action.key])}
              />
            ))}
          </View>

          <Text className="gd-section-title">{t("home.preferNotApp")}</Text>
          <CallToOrderBanner />

          {/*
            The heading has to match where the list came from. Calling the
            static fallback "order again" would tell a first-time customer they
            had ordered six things they have never seen.
          */}
          <Text className="gd-section-title">
            {t(fromHistory ? "home.reorder" : "home.popular")}
          </Text>
          {results.length > 0 ? (
            <ReorderList entries={results} />
          ) : (
            <View className="gd-empty">
              <Text className="gd-empty-text">
                {t("home.searchEmpty", { query: query.trim() })}
              </Text>
              <Pressable
                style={pressRow}
                onPress={() => setQuery("")}
                accessibilityRole="button"
              >
                <Text className="gd-empty-action">{t("home.clearSearch")}</Text>
              </Pressable>
            </View>
          )}

          {/*
            Only appears once something is in the cart. A count and no total:
            the app quotes nothing, so a rupee figure here would be a guess
            the customer reads as their bill.
          */}
          {itemCount > 0 ? (
            <Pressable
              className="gd-cart-bar"
              style={pressRow}
              onPress={() => router.push("/cart")}
              accessibilityRole="button"
            >
              <Text className="gd-cart-count">
                {t("home.inCart", { count: itemCount })}
              </Text>
              <Text className="gd-cart-total">{t("home.viewCart")}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <WhatsAppFab />
    </View>
  );
}
