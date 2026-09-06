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
import { useCustomer } from "@/lib/useCustomer";
import {
  buildServiceRequestMessage,
  openWhatsAppWith,
} from "@/lib/whatsapp";

const SafeAreaView = styled(RNSafeAreaView);

/*
 * The reason field is labelled per service rather than once for all three.
 * "Reason for the consult" is the wrong question to ask someone booking a blood
 * test, and a vague label is what produces the vague answers that make a
 * callback pointless.
 */
const SERVICE_COPY: Record<
  ServiceKey,
  {
    title: TranslationKey;
    body: TranslationKey;
    icon: string;
    reason: TranslationKey;
    reasonPlaceholder: TranslationKey;
  }
> = {
  doctorConsult: {
    title: "service.doctorConsult",
    body: "service.doctorConsultBody",
    icon: "heart-pulse",
    reason: "service.reasonConsult",
    reasonPlaceholder: "service.reasonConsultPlaceholder",
  },
  labTests: {
    title: "service.labTests",
    body: "service.labTestsBody",
    icon: "file-document-outline",
    reason: "service.reasonLab",
    reasonPlaceholder: "service.reasonLabPlaceholder",
  },
  insurance: {
    title: "service.insurance",
    body: "service.insuranceBody",
    icon: "shield-check-outline",
    reason: "service.reasonInsurance",
    reasonPlaceholder: "service.reasonInsurancePlaceholder",
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
  const customer = useCustomer();

  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  if (!key || !isServiceKey(key)) {
    return null;
  }

  const copy = SERVICE_COPY[key];

  /*
   * Goes to WhatsApp rather than nowhere.
   *
   * This button used to promise a callback and send nothing — there was no
   * backend to receive it. WhatsApp is the back office now, so the request
   * reaches a person who can actually ring back.
   */
  /** Everything the form holds, in the shape the message builder wants. */
  const details = () => ({
    service: t(copy.title),
    name: customer.name,
    phone: toE164(phone),
    reason,
    note,
  });

  const submit = async () => {
    if (!isPhoneLike(phone)) {
      notify(t(copy.title), t("service.needNumber"), t("common.ok"));
      return;
    }

    /*
     * Required, unlike the notes below it. A callback carrying only a number
     * makes someone ring back to ask the question the form could have asked,
     * and the customer has to explain themselves twice.
     */
    if (!reason.trim()) {
      notify(t(copy.title), t("service.needReason"), t("common.ok"));
      return;
    }

    const opened = await openWhatsAppWith(
      buildServiceRequestMessage(details()),
    );

    if (!opened) {
      notify(t(copy.title), t("whatsapp.openFailed"), t("common.ok"));
      return;
    }

    goBack();
  };

  /*
   * The same message as the button above, whenever the form has enough to build
   * one. This used to send the service name and nothing else, so a customer who
   * had filled the form and then tapped here arrived in WhatsApp with their own
   * details missing and had to type them again.
   */
  const whatsapp = () => {
    const text =
      isPhoneLike(phone) && reason.trim()
        ? buildServiceRequestMessage(details())
        : [t(copy.title), reason.trim(), note.trim()]
            .filter(Boolean)
            .join(" — ");

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

            <Text className="gd-section-title">{t(copy.reason)}</Text>
            <TextInput
              className="gd-textarea"
              value={reason}
              onChangeText={setReason}
              placeholder={t(copy.reasonPlaceholder)}
              placeholderTextColor={colors.inkFaint}
              multiline
              textAlignVertical="top"
            />

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
              onPress={() => void submit()}
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
