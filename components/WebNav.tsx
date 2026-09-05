import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { clsx } from "clsx";
import { usePathname, useRouter, type Href } from "expo-router";
import { Pressable, Text, View } from "react-native";

import BrandMark from "@/components/BrandMark";
import LanguageToggle from "@/components/LanguageToggle";
import { colors } from "@/constants/theme";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";
import { pressRow, pressSmall } from "@/lib/press";

const LINKS: { href: Href; labelKey: TranslationKey; match: string }[] = [
  { href: "/(tabs)", labelKey: "tabs.home", match: "/" },
  { href: "/(tabs)/orders", labelKey: "tabs.orders", match: "/orders" },
  { href: "/order-medicines", labelKey: "home.action.orderMedicine", match: "/order-medicines" },
  { href: "/upload-prescription", labelKey: "rx.title", match: "/upload-prescription" },
];

/**
 * Top navigation for the browser.
 *
 * A website is navigated from the top, not from a thumb bar pinned to the
 * bottom of the window — so on desktop this replaces the tab bar entirely,
 * and carries the same destinations plus the cart and profile.
 */
const WebNav = () => {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const { itemCount } = useCart();

  const isActive = (match: string) =>
    match === "/" ? pathname === "/" : pathname.startsWith(match);

  return (
    <View className="gd-webnav">
      <View className="gd-webnav-inner">
        <Pressable
          style={pressRow}
          onPress={() => router.push("/(tabs)")}
          accessibilityRole="link"
          accessibilityLabel="GoliDawayi.com"
        >
          <BrandMark size={34} />
        </Pressable>

        <View className="gd-webnav-links">
          {LINKS.map((link) => (
            <Pressable
              key={link.match}
              style={pressRow}
              onPress={() => router.push(link.href)}
              accessibilityRole="link"
            >
              <Text
                className={clsx(
                  "gd-webnav-link",
                  isActive(link.match) && "gd-webnav-link-active",
                )}
              >
                {t(link.labelKey)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="gd-webnav-actions">
          <LanguageToggle />

          <Pressable
            className="gd-webnav-icon"
            style={pressSmall}
            onPress={() => router.push("/(tabs)/cart")}
            accessibilityRole="link"
            accessibilityLabel={t("tabs.cart")}
          >
            <MaterialCommunityIcons
              name="cart-outline"
              size={22}
              color={colors.ink}
            />
            {itemCount > 0 ? (
              <View className="gd-tab-badge">
                <Text className="gd-tab-badge-text">
                  {itemCount > 9 ? "9+" : itemCount}
                </Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            className="gd-webnav-icon"
            style={pressSmall}
            onPress={() => router.push("/(tabs)/profile")}
            accessibilityRole="link"
            accessibilityLabel={t("tabs.profile")}
          >
            <MaterialCommunityIcons
              name="account-outline"
              size={22}
              color={colors.ink}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default WebNav;
