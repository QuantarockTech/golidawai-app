import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Linking, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { WHATSAPP_NUMBER } from "@/constants/data";
import { colors, components } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { pressSmall } from "@/lib/press";

/** Clears the floating tab bar rather than sitting on top of it. */
const GAP_ABOVE_TAB_BAR = 16;

/**
 * Floating WhatsApp button — concept board frame 04, the third ordering route
 * alongside the app itself and the "Call to order" banner.
 */
const WhatsAppFab = () => {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();

  const open = () => {
    void Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}`);
  };

  return (
    <Pressable
      className="gd-fab"
      style={(state) => [
        {
          backgroundColor: colors.whatsapp,
          // No tab bar on the website, so it sits at the usual floating offset.
        bottom: isDesktop
          ? GAP_ABOVE_TAB_BAR * 2
          : insets.bottom + components.tabBar.height + GAP_ABOVE_TAB_BAR,
        },
        pressSmall(state),
      ]}
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={t("home.whatsapp")}
    >
      <MaterialCommunityIcons name="whatsapp" size={28} color="#ffffff" />
    </Pressable>
  );
};

export default WhatsAppFab;
