import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useLocalSearchParams } from "expo-router";
import { styled } from "nativewind";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import ScreenHeader from "@/components/ScreenHeader";
import { PHARMACY, PHARMACY_PHONE, WHATSAPP_NUMBER } from "@/constants/data";
import { colors } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/global.css";
import { isPhoneLike, toE164 } from "@/lib/auth";
import type { TranslationKey } from "@/lib/i18n/translations";
import { notify } from "@/lib/dialog";
import { useGoBack } from "@/lib/nav";
import { pressRow } from "@/lib/press";

const SafeAreaView = styled(RNSafeAreaView);

const SERVICE_COPY: Record<
  ServiceKey,
  { title: TranslationKey; body: TranslationKey; icon: string }
> = {
  doctorConsult: {
    title: "service.doctorConsult",
    body: "service.doctorConsultBody",
    icon: "heart-pulse",
  },
  labTests: {
    title: "service.labTests",
    body: "service.labTestsBody",
    icon: "file-document-outline",
  },
  insurance: {
    title: "service.insurance",
    body: "service.insuranceBody",
    icon: "shield-check-outline",
  },
};

const isServiceKey = (value: string): value is ServiceKey =>
  value in SERVICE_COPY;

/**
 * Doctor Consult, Lab Tests and Insurance.
 *
 * The concept board designs no screen for any of them, so rather than invent
 * three flows this collects a number and hands the customer the two contact
 * routes that already work. It is honest about what the app can do today.
 */
export default function ServiceRequest() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { t } = useLanguage();
  const goBack = useGoBack();

  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  if (!key || !isServiceKey(key)) {
    return null;
  }

  const copy = SERVICE_COPY[key];

  const submit = () => {
    if (!isPhoneLike(phone)) {
      notify(t(copy.title), t("service.needNumber"), t("common.ok"));
      return;
    }
    notify(
      t("service.sentTitle"),
      t("service.sentBody", { phone: toE164(phone) }),
      t("common.ok"),
    );
    goBack();
  };

  const whatsapp = () => {
    const text = [t(copy.title), note.trim()].filter(Boolean).join(" — ");
    void Linking.openURL(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`,
    );
  };

  return (
    <View className="gd-screen">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScreenHeader title={t(copy.title)} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerClassName="gd-scroll-content"
            keyboardShouldPersistTaps="handled"
          >
            <View className="gd-service-hero">
              <View className="gd-service-icon">
                <MaterialCommunityIcons
                  name={copy.icon as never}
                  size={26}
                  color={colors.brandDark}
                />
              </View>
              <Text className="gd-service-body">{t(copy.body)}</Text>
            </View>

            <Text className="gd-section-title">
              {t("service.requestTitle")}
            </Text>
            <Text className="gd-service-body mb-3">
              {t("service.requestBody")}
            </Text>

            <View className="gd-field">
              <Text className="ga-label">{t("service.yourNumber")}</Text>
              <TextInput
                className="ga-input"
                value={phone}
                onChangeText={setPhone}
                placeholder="98765 43210"
                placeholderTextColor={colors.inkFaint}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
            </View>

            <Text className="gd-section-title">{t("service.note")}</Text>
            <TextInput
              className="gd-textarea"
              value={note}
              onChangeText={setNote}
              placeholder={t("rx.notesPlaceholder")}
              placeholderTextColor={colors.inkFaint}
              multiline
              textAlignVertical="top"
            />

            <Pressable
              className="gd-btn mt-5"
              style={pressRow}
              onPress={submit}
              accessibilityRole="button"
            >
              <Text className="gd-btn-text">{t("service.submit")}</Text>
            </Pressable>

            <View className="gd-contact-row">
              <Pressable
                className="gd-contact-btn"
                style={pressRow}
                onPress={() => void Linking.openURL(`tel:${PHARMACY_PHONE}`)}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons
                  name="phone"
                  size={18}
                  color={colors.brandDark}
                />
                <Text className="gd-contact-text">{t("service.callUs")}</Text>
              </Pressable>

              <Pressable
                className="gd-contact-btn"
                style={pressRow}
                onPress={whatsapp}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons
                  name="whatsapp"
                  size={18}
                  color={colors.whatsapp}
                />
                <Text className="gd-contact-text">
                  {t("service.whatsappUs")}
                </Text>
              </Pressable>
            </View>

            <Text className="gd-map-note mt-4">{PHARMACY.phoneDisplay}</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
