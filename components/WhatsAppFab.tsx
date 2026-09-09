import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Linking, Pressable } from "react-native";

import { WHATSAPP_NUMBER } from "@/constants/data";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsDesktop } from "@/lib/useIsDesktop";

/**
 * Clears the tab bar rather than sitting on top of it.
 *
 * The gap alone, not the bar's height on top of it: a visible tab bar is the
 * screen's sibling in the navigator's column, so the screen this button is
 * anchored to already stops where the bar starts. Adding the bar's height and
 * the gesture inset as well lifted it a hundred-odd pixels up the page, over
 * the quick-action grid.
 */
const GAP_ABOVE_TAB_BAR = 16;

/** The website has no tab bar, so the button clears the page edge instead. */
const GAP_DESKTOP = 32;

/**
 * Floating WhatsApp button — concept board frame 04, the third ordering route
 * alongside the app itself and the "Call to order" banner.
 */
const WhatsAppFab = () => {
  const { t } = useLanguage();
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
      // platform-dependent offset stays here.
      style={{ bottom: isDesktop ? GAP_DESKTOP : GAP_ABOVE_TAB_BAR }}
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={t("home.whatsapp")}
    >
      <MaterialCommunityIcons name="whatsapp" size={28} color="#ffffff" />
    </Pressable>
  );
};

export default WhatsAppFab;
