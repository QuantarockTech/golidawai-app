import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import clsx from "clsx";
import { styled } from "nativewind";
import { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import ScreenHeader from "@/components/ScreenHeader";
import { AMBULANCE_PHONE, AMBULANCE_TYPES, PHARMACY } from "@/constants/data";
import { colors } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/global.css";
import type { TranslationKey } from "@/lib/i18n/translations";
import { pressRow } from "@/lib/press";
import { formatRupees } from "@/lib/utils";

const SafeAreaView = styled(RNSafeAreaView);

const TYPE_COPY: Record<string, { name: TranslationKey; body: TranslationKey }> =
  {
    bls: { name: "amb.bls", body: "amb.blsBody" },
    icu: { name: "amb.icu", body: "amb.icuBody" },
  };

/** Ambulance Booking — concept board frame 07. */
export default function Ambulance() {
  const { t } = useLanguage();
  const [selected, setSelected] = useState(AMBULANCE_TYPES[0].id);

  const callDispatch = () => {
    Alert.alert(
      t("home.ambulanceTitle"),
      t("home.ambulanceBody", { number: AMBULANCE_PHONE }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("home.ambulanceConfirm"),
          style: "destructive",
          onPress: () => void Linking.openURL(`tel:${AMBULANCE_PHONE}`),
        },
      ],
    );
  };

  return (
    <View className="gd-screen">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* The board sets this one title in emergency red. */}
        <ScreenHeader title={t("amb.title")} tone="emergency" />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gd-scroll-content"
        >
          {/*
           * A placeholder, not a map: live tracking needs a dispatch partner
           * and a maps key, and a fake map that never moves would imply an
           * ambulance is being tracked when nothing is.
           */}
          <View className="gd-map">
            <MaterialCommunityIcons
              name="map-marker-radius-outline"
              size={34}
              color={colors.brandDark}
            />
          </View>
          <Text className="gd-map-note">{t("amb.mapNote")}</Text>

          <View className="gd-address mt-3">
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={20}
              color={colors.brandDark}
            />
            <Text className="gd-address-text">
              {t("amb.pickup")}: {PHARMACY.addressLines[0]}
            </Text>
          </View>

          <Text className="gd-section-title">{t("amb.chooseType")}</Text>

          {AMBULANCE_TYPES.map((type) => {
            const active = selected === type.id;
            const copy = TYPE_COPY[type.id];

            return (
              <Pressable
                key={type.id}
                className={clsx(
                  "gd-amb-type",
                  active && "gd-amb-type-selected",
                )}
                style={pressRow}
                onPress={() => setSelected(type.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <View className="gd-amb-icon">
                  <MaterialCommunityIcons
                    name="ambulance"
                    size={20}
                    color={colors.emergency}
                  />
                </View>

                <View className="min-w-0 flex-1">
                  <Text className="gd-amb-name">{t(copy.name)}</Text>
                  <Text className="gd-amb-body" numberOfLines={1}>
                    {t(copy.body)}
                  </Text>
                </View>

                <View>
                  <Text className="gd-amb-eta">
                    {t("amb.minutes", { count: type.etaMinutes })}
                  </Text>
                  <Text className="gd-amb-price">
                    {formatRupees(type.price)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View className="px-5 pb-4 pt-2">
          <Pressable
            className="gd-btn-emergency"
            style={pressRow}
            onPress={callDispatch}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="phone" size={20} color="#ffffff" />
            <Text className="gd-btn-emergency-text">{t("amb.callNow")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
