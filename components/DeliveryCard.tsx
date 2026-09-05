import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/theme";
import { useDelivery } from "@/contexts/DeliveryContext";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/global.css";
import { pressRow } from "@/lib/press";

/**
 * The delivery address, shown wherever an order can be sent.
 *
 * Repeated on all three ordering screens on purpose. The address travels inside
 * a WhatsApp message that nobody can correct afterwards, so the last thing the
 * customer sees before sending should be where it is going — and changing it
 * has to be one tap from there, not buried in a profile screen.
 */
export default function DeliveryCard() {
  const { t } = useLanguage();
  const router = useRouter();
  const { address } = useDelivery();

  const line = address?.text || (address ? t("address.pinOnly") : "");

  return (
    <>
      <Text className="gd-section-title">{t("rx.deliverTo")}</Text>

      <Pressable
        className="gd-address"
        style={pressRow}
        onPress={() => router.push("/delivery-address")}
        accessibilityRole="button"
        accessibilityLabel={
          address ? t("address.change") : t("address.addAction")
        }
      >
        <MaterialCommunityIcons
          name={address ? "map-marker-outline" : "map-marker-plus-outline"}
          size={20}
          color={address ? colors.brandDark : colors.inkFaint}
        />

        <View className="min-w-0 flex-1">
          {address ? (
            <>
              <Text className="gd-address-text">{line}</Text>
              {address.source === "map" ? (
                <Text className="gd-locate-hint">{t("address.fromMap")}</Text>
              ) : address.source === "gps" ? (
                <Text className="gd-locate-hint">{t("address.fromGps")}</Text>
              ) : null}
            </>
          ) : (
            <Text className="gd-address-empty">{t("address.none")}</Text>
          )}
        </View>

        <Text className="gd-link">
          {address ? t("address.change") : t("address.addAction")}
        </Text>
      </Pressable>
    </>
  );
}
