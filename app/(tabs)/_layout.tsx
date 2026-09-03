import { tabs } from "@/constants/data";
import { colors, components } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";
import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Tabs } from "expo-router";
import { Image } from "react-native";
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

/**
 * Board frame 04 marks the selected tab by colouring the icon, not by putting a
 * filled pill behind it. The artwork is a white PNG, so the colour has to come
 * from tintColor rather than a text colour.
 */
const TabIcon = ({ focused, icon }: TabIconProps) => (
  <Image
    source={icon}
    resizeMode="contain"
    /*
     * Inline, not a class: react-native-web writes the source image's intrinsic
     * dimensions as an inline style, which outranks any class. Without this
     * each icon drew at its natural 120x120 on web.
     */
    style={{
      width: tabBar.iconSize,
      height: tabBar.iconSize,
      tintColor: focused ? colors.brandDark : colors.inkFaint,
    }}
  />
);
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
        // The board labels every tab; unlabelled line icons are a guessing game.
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.brandDark,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: {
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
