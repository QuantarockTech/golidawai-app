import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import clsx from "clsx";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { pressSmall } from "@/lib/press";

type ScreenHeaderProps = {
  title: string;
  /** Ambulance is the one screen the board sets in emergency red. */
  tone?: "ink" | "emergency";
};

/** Back arrow + title bar — concept board's `.app-topbar`. */
const ScreenHeader = ({ title, tone = "ink" }: ScreenHeaderProps) => {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <View className="gd-topbar">
      <Pressable
        className="gd-topbar-back"
        style={pressSmall}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={t("screen.back")}
        hitSlop={8}
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={26}
          color={colors.ink}
        />
      </Pressable>

      <Text
        className={clsx(
          "gd-topbar-title",
          tone === "emergency" && "gd-topbar-title-emergency",
        )}
        numberOfLines={1}
      >
        {title}
      </Text>
    </View>
  );
};

export default ScreenHeader;
