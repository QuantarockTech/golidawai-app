import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { styled } from "nativewind";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import ScreenHeader from "@/components/ScreenHeader";
import { colors } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/global.css";

const SafeAreaView = styled(RNSafeAreaView);

/**
 * Ambulance — held back until the service behind it is real.
 *
 * This screen used to run the whole thing: locate the caller, show the point on
 * a map, and dial 108. It worked, but the client is not ready to put an
 * emergency flow in front of customers, so it says so plainly instead of half
 * offering something nobody is standing behind.
 *
 * Kept as a route rather than deleted, so the home tile, any deep link and the
 * /ambulance URL all land somewhere honest. The previous implementation is in
 * git history — see the commit that replaced it — and the `amb.*` strings are
 * left in the translation files on purpose, ready for when it comes back.
 */
export default function Ambulance() {
  const { t } = useLanguage();

  return (
    <View className="gd-screen">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScreenHeader title={t("amb.title")} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gd-scroll-content"
        >
          <View className="gd-service-hero">
            <View className="gd-service-icon">
              <MaterialCommunityIcons
                name="ambulance"
                size={26}
                color={colors.brandDark}
              />
            </View>
            <Text className="gd-soon-title">{t("amb.soonTitle")}</Text>
            <Text className="gd-service-body">{t("amb.soonBody")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
