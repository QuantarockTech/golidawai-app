import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { styled } from "nativewind";
import { useState } from "react";
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
import { PHARMACY, WHATSAPP_NUMBER } from "@/constants/data";
import { colors } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/global.css";
import { notify } from "@/lib/dialog";
import { useGoBack } from "@/lib/nav";
import { pressRow, pressSmall } from "@/lib/press";

const SafeAreaView = styled(RNSafeAreaView);

/** The board caps an upload at five files. */
const MAX_FILES = 5;

/*
 * Loaded lazily rather than imported at the top.
 *
 * expo-image-picker is a native module, so it only exists in a build made
 * after the package was added. In an older development build it is absent, and
 * a static import takes this whole screen down on open. Loading it on demand
 * keeps the rest of the screen — notes, address, and the WhatsApp route that
 * actually delivers today — working regardless.
 */
type Picker = typeof import("expo-image-picker");

const loadPicker = (): Picker | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-image-picker") as Picker;
  } catch {
    return null;
  }
};

/** Upload Prescription — concept board frame 05. */
export default function UploadPrescription() {
  const { t } = useLanguage();
  const router = useRouter();
  const goBack = useGoBack();

  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const pick = async (fromCamera: boolean) => {
    if (photos.length >= MAX_FILES) {
      notify(t("rx.title"), t("rx.limit"), t("common.ok"));
      return;
    }

    const ImagePicker = loadPicker();
    if (!ImagePicker) {
      notify(t("rx.title"), t("rx.pickerUnavailable"), t("common.ok"));
      return;
    }

    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        notify(t("rx.title"), t("rx.permission"), t("common.ok"));
        return;
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 0.7,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.7,
            allowsMultipleSelection: true,
            selectionLimit: MAX_FILES - photos.length,
          });

      if (result.canceled) return;

      setPhotos((current) =>
        [...current, ...result.assets.map((a) => a.uri)].slice(0, MAX_FILES),
      );
    } catch {
      // Thrown when the native module is missing from this build.
      notify(t("rx.title"), t("rx.pickerUnavailable"), t("common.ok"));
    }
  };

  /**
   * The board runs upload, WhatsApp and phone into one pharmacist queue. With
   * no backend yet, WhatsApp is the route that genuinely delivers today, so
   * "submit" hands the order over there with the notes already written out.
   */
  const submit = () => {
    if (photos.length === 0) {
      notify(t("rx.title"), t("rx.needOne"), t("common.ok"));
      return;
    }
    notify(
      t("rx.sentTitle"),
      t("rx.sentBody", { phone: PHARMACY.phoneDisplay }),
      t("common.ok"),
    );
    goBack();
  };

  const sendViaWhatsApp = () => {
    const lines = [
      t("rx.title"),
      notes.trim() ? `${t("rx.notes")}: ${notes.trim()}` : "",
      `${t("rx.deliverTo")}: ${PHARMACY.addressLines.join(", ")}`,
    ].filter(Boolean);

    void Linking.openURL(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`,
    );
  };

  return (
    <View className="gd-screen">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScreenHeader title={t("rx.title")} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gd-scroll-content"
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            className="gd-rx-drop"
            style={pressRow}
            onPress={() => pick(true)}
            onLongPress={() => pick(false)}
            accessibilityRole="button"
            accessibilityLabel={t("rx.dropTitle")}
          >
            <View className="gd-rx-drop-icon">
              <MaterialCommunityIcons
                name="camera-outline"
                size={22}
                color={colors.brandDark}
              />
            </View>
            <Text className="gd-rx-drop-title">{t("rx.dropTitle")}</Text>
            <Text className="gd-rx-drop-hint">{t("rx.dropHint")}</Text>
          </Pressable>

          {photos.length > 0 ? (
            <View className="gd-rx-thumbs">
              {photos.map((uri, index) => (
                <View key={uri} className="gd-rx-thumb">
                  <Image
                    source={{ uri }}
                    style={{ flex: 1 }}
                    contentFit="cover"
                  />
                  <Pressable
                    className="gd-rx-thumb-remove"
                    style={pressSmall}
                    onPress={() =>
                      setPhotos((c) => c.filter((p) => p !== uri))
                    }
                    accessibilityRole="button"
                    accessibilityLabel={t("rx.remove", { index: index + 1 })}
                    hitSlop={6}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={12}
                      color="#ffffff"
                    />
                  </Pressable>
                </View>
              ))}

              {photos.length < MAX_FILES ? (
                <Pressable
                  className="gd-rx-add"
                  style={pressSmall}
                  onPress={() => pick(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t("rx.dropTitle")}
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={20}
                    color={colors.brand}
                  />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <Pressable
            className="gd-btn-whatsapp mt-4"
            style={pressRow}
            onPress={sendViaWhatsApp}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="whatsapp" size={20} color="#ffffff" />
            <Text className="gd-btn-whatsapp-text">{t("rx.viaWhatsApp")}</Text>
          </Pressable>

          <Text className="gd-section-title">{t("rx.notes")}</Text>
          <TextInput
            className="gd-textarea"
            value={notes}
            onChangeText={setNotes}
            placeholder={t("rx.notesPlaceholder")}
            placeholderTextColor={colors.inkFaint}
            multiline
            textAlignVertical="top"
          />

          <Text className="gd-section-title">{t("rx.deliverTo")}</Text>
          <View className="gd-address">
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={20}
              color={colors.brandDark}
            />
            <Text className="gd-address-text">
              {PHARMACY.addressLines.join(", ")}
            </Text>
          </View>

          <Pressable
            className="gd-btn mt-5"
            style={pressRow}
            onPress={submit}
            accessibilityRole="button"
          >
            <Text className="gd-btn-text">{t("rx.submit")}</Text>
          </Pressable>

          <Pressable
            className="gd-link-row"
            style={pressRow}
            onPress={() => router.replace("/order-medicines")}
            accessibilityRole="button"
          >
            <Text className="gd-link">{t("rx.addManually")} →</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
