import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { styled } from "nativewind";
import { useEffect, useRef, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import ScreenHeader from "@/components/ScreenHeader";
import { colors } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePeople } from "@/contexts/PeopleContext";
import "@/global.css";
import { isPhoneLike, toE164 } from "@/lib/auth";
import { confirm, notify } from "@/lib/dialog";
import { useGoBack } from "@/lib/nav";
import { pressRow } from "@/lib/press";

const SafeAreaView = styled(RNSafeAreaView);

/**
 * Who to ring when the customer cannot be reached.
 *
 * One contact rather than a list, on purpose. This gets read in the moment
 * somebody is standing at the wrong gate with a bag of medicines, and a list of
 * three is a decision nobody makes then.
 */
export default function EmergencyContactScreen() {
  const { t } = useLanguage();
  const goBack = useGoBack();
  const { emergency, saveEmergency, clearEmergency, isLoaded } = usePeople();

  const [name, setName] = useState(emergency?.name ?? "");
  const [relation, setRelation] = useState(emergency?.relation ?? "");
  const [phone, setPhone] = useState(emergency?.phone ?? "");

  /*
   * The fields are seeded at first render, and at first render storage has not
   * been read yet — the same trap the delivery address screen fell into. This
   * fills them once the read settles, and once only, so nothing typed here is
   * undone by a late write or by the account's copy arriving.
   */
  const filled = useRef(false);

  useEffect(() => {
    if (filled.current || !isLoaded) return;
    filled.current = true;

    if (!emergency) return;
    setName(emergency.name);
    setRelation(emergency.relation ?? "");
    setPhone(emergency.phone);
  }, [isLoaded, emergency]);

  const onSave = () => {
    const trimmed = name.trim();

    if (!trimmed) {
      notify(t("emergency.title"), t("emergency.nameNeeded"), t("common.ok"));
      return;
    }

    // The whole point of the record. A name with no number is a note to
    // nobody, so this is the one field that cannot be skipped.
    if (!isPhoneLike(phone)) {
      notify(t("emergency.title"), t("emergency.phoneNeeded"), t("common.ok"));
      return;
    }

    saveEmergency({
      name: trimmed,
      ...(relation.trim() ? { relation: relation.trim() } : {}),
      phone: toE164(phone),
    });

    goBack();
  };

  const askClear = () => {
    confirm({
      title: t("emergency.removeTitle"),
      message: t("emergency.removeBody"),
      confirmLabel: t("emergency.remove"),
      cancelLabel: t("common.cancel"),
      destructive: true,
      onConfirm: () => {
        clearEmergency();
        goBack();
      },
    });
  };

  return (
    <View className="gd-screen">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScreenHeader title={t("emergency.title")} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gd-scroll-content"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="gd-custom-note mt-0">{t("emergency.intro")}</Text>

          <Text className="gd-section-title">{t("emergency.name")}</Text>
          <TextInput
            className="gd-input-line"
            value={name}
            onChangeText={setName}
            placeholder={t("emergency.namePlaceholder")}
            placeholderTextColor={colors.inkFaint}
          />

          <Text className="gd-section-title">{t("emergency.relation")}</Text>
          <TextInput
            className="gd-input-line"
            value={relation}
            onChangeText={setRelation}
            placeholder={t("emergency.relationPlaceholder")}
            placeholderTextColor={colors.inkFaint}
          />

          <Text className="gd-section-title">{t("emergency.phone")}</Text>
          <View className="gd-search gd-addr-search">
            <MaterialCommunityIcons
              name="phone-outline"
              size={20}
              color={colors.inkFaint}
            />
            <TextInput
              className="gd-search-input"
              value={phone}
              onChangeText={setPhone}
              placeholder={t("address.phonePlaceholder")}
              placeholderTextColor={colors.inkFaint}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
            />
          </View>

          {/*
            Only for a contact that is already saved. Offering to ring a number
            still being typed would dial whatever half of it exists.
          */}
          {emergency ? (
            <Pressable
              className="gd-call mt-4"
              style={pressRow}
              onPress={() => void Linking.openURL(`tel:${emergency.phone}`)}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons
                name="phone"
                size={18}
                color={colors.brandDark}
              />
              <Text className="gd-call-title">
                {t("emergency.call", { name: emergency.name })}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            className="gd-btn mt-5"
            style={pressRow}
            onPress={onSave}
            accessibilityRole="button"
          >
            <Text className="gd-btn-text">{t("emergency.save")}</Text>
          </Pressable>

          {emergency ? (
            <Pressable
              className="gd-btn-ghost"
              style={pressRow}
              onPress={askClear}
              accessibilityRole="button"
            >
              <Text className="gd-btn-ghost-text">{t("emergency.remove")}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
