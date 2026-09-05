import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { clsx } from "clsx";
import { Pressable, Text, View } from "react-native";

import WebNav from "@/components/WebNav";
import { colors } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useGoBack } from "@/lib/nav";
import { pressSmall } from "@/lib/press";
import { useIsDesktop } from "@/lib/useIsDesktop";

type ScreenHeaderProps = {
  title: string;
  /** Ambulance is the one screen the board sets in emergency red. */
  tone?: "ink" | "emergency";
};

/** Back arrow + title bar — concept board's `.app-topbar`. */
const ScreenHeader = ({ title, tone = "ink" }: ScreenHeaderProps) => {
  const { t } = useLanguage();
  const isDesktop = useIsDesktop();
  const goBack = useGoBack();

  return (
    <>
      {/*
       * These screens live in the root stack rather than the tab navigator, so
       * they do not get the tabs' header. Without this the website would drop
       * its navigation the moment you opened one of them.
       */}
      {isDesktop ? <WebNav /> : null}

      <View className="gd-topbar">
        <Pressable
          className="gd-topbar-back"
          style={pressSmall}
          onPress={goBack}
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
    </>
  );
};

export default ScreenHeader;
