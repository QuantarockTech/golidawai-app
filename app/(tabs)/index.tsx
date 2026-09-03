import { useUser } from "@clerk/clerk-expo";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import { styled } from "nativewind";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import CallToOrderBanner from "@/components/CallToOrderBanner";
import LanguageToggle from "@/components/LanguageToggle";
import QuickActionTile from "@/components/QuickActionTile";
import ReorderList from "@/components/ReorderList";
import WhatsAppFab from "@/components/WhatsAppFab";
import { QUICK_ACTIONS, REORDER_ITEMS } from "@/constants/data";
import { colors } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/global.css";
import type { TranslationKey } from "@/lib/i18n/translations";

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
           * Deliberately a Pressable, not a TextInput: search has no backend to
           * query yet, and a field that takes focus and returns nothing reads
           * as broken. This navigates once the search screen exists.
           */}
          <Pressable className="gd-search" accessibilityRole="search">
            <MaterialCommunityIcons
              name="magnify"
              size={18}
              color={colors.inkFaint}
            />
            <Text className="gd-search-text" numberOfLines={1}>
              {t("home.searchPlaceholder")}
            </Text>
          </Pressable>

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
                // Destinations arrive with their own screens (board frames
                // 05-07); the grid ships first so the shape is real.
                onPress={() => {}}
              />
            ))}
          </View>

          <Text className="gd-section-title">{t("home.preferNotApp")}</Text>
          <CallToOrderBanner />

          <Text className="gd-section-title">{t("home.reorder")}</Text>
          <ReorderList items={REORDER_ITEMS} onAdd={() => {}} />
        </ScrollView>
      </SafeAreaView>

      <WhatsAppFab />
    </View>
  );
}
