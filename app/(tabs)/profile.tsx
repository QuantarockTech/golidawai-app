import { useAuth, useUser } from "@clerk/clerk-expo";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter, type Href } from "expo-router";
import clsx from "clsx";
import { styled } from "nativewind";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import LanguageToggle from "@/components/LanguageToggle";
import { colors } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/global.css";
import type { TranslationKey } from "@/lib/i18n/translations";
import { pressRow } from "@/lib/press";

const SafeAreaView = styled(RNSafeAreaView);

type Row = {
  key: string;
  icon: string;
  labelKey: TranslationKey;
  href?: Href;
};

const HEALTH_ROWS: Row[] = [
  {
    key: "prescriptions",
    icon: "file-document-outline",
    labelKey: "profile.prescriptions",
    href: "/upload-prescription",
  },
  { key: "family", icon: "account-multiple-outline", labelKey: "profile.family" },
  { key: "emergency", icon: "phone-outline", labelKey: "profile.emergency" },
];

const ACCOUNT_ROWS: Row[] = [
  { key: "addresses", icon: "map-marker-outline", labelKey: "profile.addresses" },
  { key: "payments", icon: "wallet-outline", labelKey: "profile.payments" },
  {
    key: "insurance",
    icon: "shield-check-outline",
    labelKey: "profile.insurance",
    href: "/service/insurance",
  },
];

/** Profile & Family — concept board frame 09. */
export default function Profile() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const displayName =
    user?.fullName || user?.firstName || user?.emailAddresses[0]?.emailAddress || "";
  const initial = (displayName.trim()[0] ?? "G").toUpperCase();
  // Sign-up stores the delivery number here; Clerk phone identifiers are paid.
  const phone =
    typeof user?.unsafeMetadata?.phone === "string"
      ? user.unsafeMetadata.phone
      : "";

  const comingSoon = (label: string) => {
    Alert.alert(t("home.comingSoonTitle"), t("home.comingSoonBody", {
      feature: label,
    }), [{ text: t("common.ok") }]);
  };

  const confirmLogout = () => {
    Alert.alert(t("profile.logout"), t("profile.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.logout"),
        style: "destructive",
        onPress: () => void signOut(),
      },
    ]);
  };

  const renderRow = (row: Row, index: number) => (
    <Pressable
      key={row.key}
      className={clsx("gd-list-item", index > 0 && "gd-list-divider")}
      style={pressRow}
      onPress={() =>
        row.href ? router.push(row.href) : comingSoon(t(row.labelKey))
      }
      accessibilityRole="button"
    >
      <View className="gd-list-icon">
        <MaterialCommunityIcons
          name={row.icon as never}
          size={18}
          color={colors.brandDark}
        />
      </View>
      <Text className="gd-list-label">{t(row.labelKey)}</Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={colors.inkFaint}
      />
    </Pressable>
  );

  return (
    <View className="gd-screen">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gd-scroll-content"
        >
          <View className="gd-profile-row">
            <View className="gd-avatar">
              <Text className="gd-avatar-text">{initial}</Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text className="gd-profile-name" numberOfLines={1}>
                {displayName}
              </Text>
              <Text className="gd-profile-phone" numberOfLines={1}>
                {phone || t("profile.noPhone")}
              </Text>
            </View>
          </View>

          <Text className="gd-section-title">{t("profile.health")}</Text>
          <View className="gd-list-card">{HEALTH_ROWS.map(renderRow)}</View>

          <Text className="gd-section-title">{t("profile.account")}</Text>
          <View className="gd-list-card">
            {ACCOUNT_ROWS.map(renderRow)}

            {/*
             * The board gives the EN/हिं switch a permanent home here, beyond
             * the header toggle. The control itself is the row's value.
             */}
            <View className="gd-list-item gd-list-divider">
              <View className="gd-list-icon">
                <MaterialCommunityIcons
                  name="web"
                  size={18}
                  color={colors.brandDark}
                />
              </View>
              <Text className="gd-list-label">{t("profile.language")}</Text>
              <LanguageToggle />
            </View>
          </View>

          <Pressable
            className="gd-list-card mt-4"
            style={pressRow}
            onPress={confirmLogout}
            accessibilityRole="button"
          >
            <View className="gd-list-item">
              <View className="gd-list-icon-danger">
                <MaterialCommunityIcons
                  name="logout"
                  size={18}
                  color={colors.emergency}
                />
              </View>
              <Text className="gd-list-label-danger">{t("profile.logout")}</Text>
            </View>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
