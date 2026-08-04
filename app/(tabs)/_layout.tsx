import { tabs } from "@/constants/data";
import { colors, components } from "@/constants/theme";
import clsx from "clsx";
import { Tabs } from "expo-router";
import { Image, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const tabBar = components.tabBar;

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
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        contentStyle: {
          paddingBottom: tabBar.height + bottomInset + 16,
        },
        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: tabBar.height + bottomInset,
          paddingBottom: bottomInset,
          paddingHorizontal: tabBar.horizontalInset,
          borderRadius: tabBar.radius,
          backgroundColor: colors.primary,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
          justifyContent: "center",
          paddingVertical: 0,
          height: tabBar.height,
        },
        tabBarIconStyle: {
          width: tabBar.iconFrame,
          height: tabBar.iconFrame,
          alignItems: "center",
          justifyContent: "center",
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon={tab.icon} />
            ),
          }}
        />
      ))}
      <Tabs.Screen
        name="subscriptions/[id]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
};

export default TabLayout;
