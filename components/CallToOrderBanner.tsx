import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Linking, Pressable, Text, View } from "react-native";

import { PHARMACY_PHONE } from "@/constants/data";
import { colors } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * "Call to order" — concept board frame 04.
 *
 * The board runs three ordering routes side by side (app, phone, WhatsApp) so
 * someone who can't or won't work the app still gets served. This is the
 * phone one; the whole row is tappable, not just the pill, since the pill is
 * a small target for the older customers this exists for.
 */
const CallToOrderBanner = () => {
  const { t } = useLanguage();

  const call = () => {
    void Linking.openURL(`tel:${PHARMACY_PHONE}`);
  };

  return (
    <Pressable
      className="gd-call"
      onPress={call}
      accessibilityRole="button"
      accessibilityLabel={`${t("home.callToOrder")}. ${t("home.callToOrderBody")}`}
    >
      <View className="gd-call-icon">
        <MaterialCommunityIcons
          name="phone"
          size={20}
          color={colors.brandDark}
        />
      </View>

      <View className="min-w-0 flex-1">
        <Text className="gd-call-title">{t("home.callToOrder")}</Text>
        <Text className="gd-call-body" numberOfLines={1}>
          {t("home.callToOrderBody")}
        </Text>
      </View>

      <View className="gd-call-cta">
        <Text className="gd-call-cta-text">{t("home.callNow")}</Text>
      </View>
    </Pressable>
  );
};

export default CallToOrderBanner;
