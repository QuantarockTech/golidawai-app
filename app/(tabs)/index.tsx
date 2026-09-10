import { useUser } from "@clerk/clerk-expo";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { clsx } from "clsx";
import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { styled } from "nativewind";
import { useCallback, useState } from "react";
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
import { useCatalogue } from "@/contexts/CatalogueContext";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/global.css";
import { notify } from "@/lib/dialog";
import type { TranslationKey } from "@/lib/i18n/translations";
import { pressRow, pressSmall } from "@/lib/press";
import {
  ACTION_LABEL_KEYS,
  QUICK_ACTION_ROUTES,
  useHomeSearch,
} from "@/lib/useHomeSearch";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { useReorder } from "@/lib/useReorder";

// NativeWind only auto-handles React Native's own components; third-party ones
// need styled() or their className is dropped on native.
const SafeAreaView = styled(RNSafeAreaView);

// Runs the brand gradient across rather than down, so it reads as the same
// family as the splash hero without repeating it.
const PROMO_GRADIENT = [colors.brandDark, colors.brand] as const;

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
  const isDesktop = useIsDesktop();
  const [query, setQuery] = useState("");

  const { entries, fromHistory } = useReorder();
  const search = useHomeSearch(query);
  const { refreshIfStale } = useCatalogue();

  /*
   * Home searches the sheet now, so it has to ask for the sheet like the order
   * screen does. Without this the dashboard would search whatever copy the app
   * happened to start with, and a medicine the pharmacy added this morning
   * would read as one they don't stock. The provider ignores the call unless
   * the copy in hand is old enough to be worth replacing.
   */
  useFocusEffect(
    useCallback(() => {
      refreshIfStale();
    }, [refreshIfStale]),
  );

  /** Anything with no screen of its own yet, e.g. notifications. */
  const comingSoon = (feature: string) => {
    notify(
      t("home.comingSoonTitle"),
      t("home.comingSoonBody", { feature }),
      t("common.ok"),
    );
  };

  /*
   * Hands the query to the catalogue screen, which is the only place a name
   * the pharmacy doesn't stock can still be ordered — it turns one into a
   * typed line the pharmacist quotes by hand. Home deliberately doesn't
   * duplicate that: a dead end here would read as "we don't have it".
   */
  const openFullSearch = () =>
    router.push({
      pathname: "/order-medicines",
      params: { q: query.trim() },
    });

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
          {/*
            Phone only. A browser gets the top nav one row up, which already
            carries the account, the language toggle and the cart — repeating
            them here put two language toggles on the page and a second profile
            target under the first. The website opens on the search box.
          */}
          {isDesktop ? null : (
            <View className="gd-greet-row">
              {/*
                The avatar is where a customer expects their account to live,
                so it opens the same Profile tab the bottom bar does rather
                than sitting there as decoration.
              */}
              <Pressable
                className="gd-avatar"
                style={pressSmall}
                onPress={() => router.push("/(tabs)/profile")}
                accessibilityRole="button"
                accessibilityLabel={t("profile.title")}
                hitSlop={6}
              >
                <Text className="gd-avatar-text">{initial}</Text>
              </Pressable>

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
          )}

          {/*
           * Searches the pharmacy's whole catalogue and the app's own screens,
           * not the six rows further down. Results take over the dashboard
           * while there is a query, because a search whose answer sits below
           * the promo banner and the tile grid reads as a search that did
           * nothing.
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

          {search.active ? (
            <>
              {/*
                Screens first. They are a handful of exact matches against a
                fixed list, where the catalogue is seven hundred fuzzy ones —
                someone typing "ambulance" wants the booking screen, and
                burying it under medicines would be the wrong answer first.
              */}
              {search.services.length > 0 ? (
                <>
                  <Text className="gd-section-title">
                    {t("home.searchServices")}
                  </Text>
                  <View className="gd-med-card">
                    {search.services.map((service, index) => (
                      <Pressable
                        key={service.key}
                        className={clsx(
                          "gd-med-row",
                          index > 0 && "gd-med-divider",
                        )}
                        style={pressRow}
                        onPress={() => router.push(service.route)}
                        accessibilityRole="button"
                      >
                        <View className="gd-med-thumb">
                          <MaterialCommunityIcons
                            // Same edge as the tile grid: the glyph names come
                            // from QUICK_ACTIONS, which is data.
                            name={service.icon as never}
                            size={20}
                            color={colors.brandDark}
                          />
                        </View>
                        <View className="min-w-0 flex-1">
                          <Text className="gd-med-name" numberOfLines={1}>
                            {t(ACTION_LABEL_KEYS[service.key])}
                          </Text>
                        </View>
                        <MaterialCommunityIcons
                          name="chevron-right"
                          size={20}
                          color={colors.inkFaint}
                        />
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

              {search.medicines.length > 0 ? (
                <>
                  <Text className="gd-section-title">
                    {t("home.searchMedicines")}
                  </Text>
                  <ReorderList entries={search.medicines} />
                  {search.medicineTotal > search.medicines.length ? (
                    <Pressable
                      className="gd-search-more"
                      style={pressRow}
                      onPress={openFullSearch}
                      accessibilityRole="button"
                    >
                      <Text className="gd-empty-action">
                        {t("home.searchSeeAll", {
                          count: search.medicineTotal,
                        })}
                      </Text>
                    </Pressable>
                  ) : null}
                </>
              ) : null}

              {search.isEmpty ? (
                <View className="gd-empty">
                  <Text className="gd-empty-text">
                    {search.isLoading
                      ? t("home.searchLoading")
                      : search.failed
                        ? t("home.searchFailed")
                        : t("home.searchEmpty", { query: query.trim() })}
                  </Text>

                  {/*
                    Not stocking something is not the same as not selling it.
                    The order screen can still take the name as a typed line
                    for the pharmacist to quote, so no query dead-ends here.
                  */}
                  {search.isLoading || search.failed ? null : (
                    <Pressable
                      className="gd-empty-add"
                      style={pressRow}
                      onPress={openFullSearch}
                      accessibilityRole="button"
                    >
                      <MaterialCommunityIcons
                        name="plus"
                        size={16}
                        color={colors.brandDark}
                      />
                      <Text className="gd-empty-action">
                        {t("home.searchRequest")}
                      </Text>
                    </Pressable>
                  )}

                  <Pressable
                    style={pressRow}
                    onPress={() => setQuery("")}
                    accessibilityRole="button"
                  >
                    <Text className="gd-empty-action">
                      {t("home.clearSearch")}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : (
            <>
              <LinearGradient
                colors={PROMO_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="gd-promo"
              >
                <Text className="gd-promo-title">{t("home.promoTitle")}</Text>
                <Text className="gd-promo-body">{t("home.promoBody")}</Text>
              </LinearGradient>

              <Text className="gd-section-title">
                {t("home.whatDoYouNeed")}
              </Text>
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
                static fallback "order again" would tell a first-time customer
                they had ordered six things they have never seen.
              */}
              {entries.length > 0 ? (
                <>
                  <Text className="gd-section-title">
                    {t(fromHistory ? "home.reorder" : "home.popular")}
                  </Text>
                  <ReorderList entries={entries} />
                </>
              ) : null}
            </>
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
