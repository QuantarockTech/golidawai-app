import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Tabs } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import WebNav from "@/components/WebNav";
import { colors, components } from "@/constants/theme";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";
import { useIsDesktop } from "@/lib/useIsDesktop";

const tabBar = components.tabBar;

/**
 * Board frame 09's tab bar: Home, Orders, Cart, Profile. Icons come from the
 * vector set rather than PNGs so they tint cleanly and match the line weight
 * used everywhere else in the app.
 */
const TAB_SCREENS: {
  name: string;
  titleKey: TranslationKey;
  icon: string;
}[] = [
  { name: "index", titleKey: "tabs.home", icon: "home-outline" },
  { name: "orders", titleKey: "tabs.orders", icon: "file-document-outline" },
  { name: "cart", titleKey: "tabs.cart", icon: "cart-outline" },
  { name: "profile", titleKey: "tabs.profile", icon: "account-outline" },
];

/** Count of items in the cart, drawn over the Cart tab's icon. */
const CartIcon = ({ focused }: { focused: boolean }) => {
  const { itemCount } = useCart();

  return (
    <View>
      <MaterialCommunityIcons
        name="cart-outline"
        size={tabBar.iconSize}
        color={focused ? colors.brandDark : colors.inkFaint}
      />
      {itemCount > 0 ? (
        <View className="gd-tab-badge">
          <Text className="gd-tab-badge-text">
            {itemCount > 9 ? "9+" : itemCount}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const TabLayout = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();

  // Wait for auth to load before rendering anything
  if (!isLoaded) {
    return null;
  }

  // Redirect to sign-in if user is not authenticated
  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        /*
         * A browser gets a website's top navigation; a phone keeps the bottom
         * tab bar. Both render the same screens underneath.
         */
        headerShown: isDesktop,
        header: () => <WebNav />,
        // The board labels every tab; unlabelled line icons are a guessing game.
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.brandDark,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: isDesktop
          ? { display: "none" }
          : {
          // A flat white strip on a hairline, flush to the bottom edge —
          // board frame 04, replacing the template's floating dark pill.
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.hairlineSoft,
          // The inset is padding rather than height so the bar's colour runs
          // under the home indicator instead of leaving a strip of screen.
          height: tabBar.height + insets.bottom,
          paddingTop: tabBar.paddingTop,
          paddingBottom: insets.bottom,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontFamily: "Poppins_500Medium",
          fontSize: tabBar.labelSize,
        },
      }}
    >
      {TAB_SCREENS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.titleKey),
            tabBarIcon: ({ focused }) =>
              tab.name === "cart" ? (
                <CartIcon focused={focused} />
              ) : (
                <MaterialCommunityIcons
                  name={tab.icon as never}
                  size={tabBar.iconSize}
                  color={focused ? colors.brandDark : colors.inkFaint}
                />
              ),
          }}
        />
      ))}
    </Tabs>
  );
};

export default TabLayout;
