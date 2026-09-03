import { tabs } from "@/constants/data";
import { colors, components } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";
import { useAuth } from "@clerk/clerk-expo";
import clsx from "clsx";
import { Redirect, Tabs } from "expo-router";
import { Image, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const tabBar = components.tabBar;

/*
 * constants/data.ts stores each tab's English title; the route name is the
 * stable key, so titles are looked up at render time and follow the language.
 */
const TAB_TITLE_KEYS: Partial<Record<string, TranslationKey>> = {
  index: "tabs.home",
  subscriptions: "tabs.subscriptions",
  insights: "tabs.insights",
  settings: "tabs.settings",
};

const TabIcon = ({ focused, icon }: TabIconProps) => {
  return (
    <View className="tabs-icon">
      <View className={clsx("tabs-pill", focused && "tabs-active")}>
        <Image source={icon} resizeMode="contain" className="tabs-glyph" />
      </View>
    </View>
  );
};
const TabLayout = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

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
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          bottom: Math.max(insets.bottom, tabBar.horizontalInset),
          height: tabBar.height,
          marginHorizontal: tabBar.horizontalInset,
          borderRadius: tabBar.radius,
          backgroundColor: colors.primary,
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarItemStyle: {
          paddingVertical: tabBar.height / 2 - tabBar.iconFrame / 1.6,
        },
        tabBarIconStyle: {
          width: tabBar.iconFrame,
          height: tabBar.iconFrame,
          alignItems: "center",
        },
      }}
    >
      {tabs.map((tab) => {
        // A tab added without a key keeps its English title rather than blanking.
        const titleKey = TAB_TITLE_KEYS[tab.name];

        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: titleKey ? t(titleKey) : tab.title,
              tabBarIcon: ({ focused }) => (
                <TabIcon focused={focused} icon={tab.icon} />
              ),
            }}
          />
        );
      })}
      <Tabs.Screen name="subscriptions/[id]" options={{ href: null }} />
    </Tabs>
  );
};

export default TabLayout;
