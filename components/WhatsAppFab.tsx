import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Linking, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { WHATSAPP_NUMBER } from "@/constants/data";
import { components } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsDesktop } from "@/lib/useIsDesktop";

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
      // A plain object, not a `(state) => …` callback. Next to a className,
      // NativeWind appends the inline style to an array it hands the native
      // view, and a function in that array is dropped rather than called — so
      // the fill and the press response live in .gd-fab instead, and only the
      // inset-dependent offset stays here.
      style={{
        // No tab bar on the website, so it sits at the usual floating offset.
        bottom: isDesktop
          ? GAP_ABOVE_TAB_BAR * 2
          : insets.bottom + components.tabBar.height + GAP_ABOVE_TAB_BAR,
      }}
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={t("home.whatsapp")}
    >
      <MaterialCommunityIcons name="whatsapp" size={28} color="#ffffff" />
    </Pressable>
  );
};

export default WhatsAppFab;
