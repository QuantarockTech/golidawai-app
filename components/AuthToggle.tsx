import { useRouter } from "expo-router";

import { useLanguage } from "@/contexts/LanguageContext";
import { Pressable, Text, View } from "react-native";

type AuthToggleProps = {
  active: "sign-in" | "sign-up";
};

/**
 * Lifts the selected pill off the track. Set here rather than in CSS so it
 * lands on all three platforms: shadow* for iOS and web, elevation for Android.
 */
const ACTIVE_SHADOW = {
  shadowColor: "#0f3c3d",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.14,
  shadowRadius: 6,
  elevation: 2,
} as const;

/** Segmented Sign In / Sign Up switch that sits above both auth forms. */
const AuthToggle = ({ active }: AuthToggleProps) => {
  const router = useRouter();
  const { t } = useLanguage();

  const options = [
    { key: "sign-in", label: t("auth.signIn"), href: "/(auth)/sign-in" },
    { key: "sign-up", label: t("auth.signUp"), href: "/(auth)/sign-up" },
  ] as const;

  return (
    <View className="ga-toggle">
      {options.map((option) => {
        const isActive = option.key === active;
        return (
          <Pressable
            key={option.key}
            className={`ga-toggle-item ${isActive ? "ga-toggle-item-active" : ""}`}
            style={isActive ? ACTIVE_SHADOW : undefined}
            onPress={() => {
              if (!isActive) router.replace(option.href);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              className={`ga-toggle-text ${isActive ? "ga-toggle-text-active" : ""}`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export default AuthToggle;
