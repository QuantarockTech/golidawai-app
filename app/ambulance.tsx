import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { styled } from "nativewind";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import MapPicker from "@/components/MapPicker";
import ScreenHeader from "@/components/ScreenHeader";
import { AMBULANCE_PHONE } from "@/constants/data";
import { colors } from "@/constants/theme";
import { useDelivery } from "@/contexts/DeliveryContext";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/global.css";
import { confirm, notify } from "@/lib/dialog";
import type { TranslationKey } from "@/lib/i18n/translations";
import {
  DEFAULT_CENTRE,
  describeCoordinates,
  isCoarseFix,
  locateCurrentAddress,
  type LocateFailure,
} from "@/lib/location";
import { pressRow, pressSmall } from "@/lib/press";

const SafeAreaView = styled(RNSafeAreaView);

/**
 * What a caller should have ready when 108 answers.
 *
 * This replaced a Basic Life Support / ICU selector. The selector looked like
 * it dispatched a vehicle and did nothing at all — 108 chooses the ambulance,
 * and a phone call carries no data from this screen. The same words are far
 * more use as something to say out loud, because a caller who can name what
 * they need helps the dispatcher send the right one.
 */
const TELL_THEM: TranslationKey[] = [
  "amb.tellWhere",
  "amb.tellWhat",
  "amb.tellNeed",
];

/** Ambulance — concept board frame 07, rebuilt around what the app can do. */
export default function Ambulance() {
  const { t } = useLanguage();
  const { address } = useDelivery();

  /*
   * Where the ambulance is going.
   *
   * Held on this screen rather than saved back to the delivery address. An
   * emergency is wherever it happens — a workplace, a relative's house — and
   * writing that over the address the customer has medicines sent to would be
   * a bad trade made silently.
   */
  const [pickup, setPickup] = useState(address?.text ?? "");
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(
    address?.latitude != null && address?.longitude != null
      ? { latitude: address.latitude, longitude: address.longitude }
      : null,
  );
  const [locating, setLocating] = useState(false);

  /*
   * True when the device answered with a fix too wide to be a doorstep.
   *
   * It matters more here than anywhere else in the app. A browser on a laptop
   * has no GPS and answers from Wi-Fi or the IP address, which in Indore lands
   * on the middle of the city — and "Indore City, Madhya Pradesh" reads like an
   * address while being useless to an ambulance.
   */
  const [coarse, setCoarse] = useState(false);

  /** Set once the customer edits the box, so nothing overwrites their words. */
  const edited = useRef(false);
  const seeded = useRef(false);

  /* The point waiting to be named, and the timer that will name it. */
  const pending = useRef<{ latitude: number; longitude: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (seeded.current || !address) return;
    seeded.current = true;

    if (address.text) setPickup(address.text);
    if (address.latitude != null && address.longitude != null) {
      setPin({ latitude: address.latitude, longitude: address.longitude });
    }
  }, [address]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const failureMessage = (reason: LocateFailure): string => {
    if (reason === "denied") return t("address.permissionDenied");
    if (reason === "unavailable") return t("address.locationUnavailable");
    if (reason === "positionUnavailable")
      return t("address.locateUnavailable");
    if (reason === "timeout") return t("address.locateTimeout");
    return t("address.locateFailed");
  };

  const fillFromDevice = async () => {
    setLocating(true);
    const result = await locateCurrentAddress();
    setLocating(false);

    if (!result.ok) {
      notify(t("amb.title"), failureMessage(result.reason), t("common.ok"));
      return;
    }

    const { text, latitude, longitude, accuracy } = result.address;
    const wide = isCoarseFix(accuracy);

    setCoarse(wide);
    setPin({ latitude, longitude });
    pending.current = null;

    /*
     * A wide fix does not get to name the place. "Indore City" is a district
     * nobody can drive to, and putting it in the box invites the caller to
     * read it out. Left blank, the map below is the obvious next move.
     */
    if (!edited.current) setPickup(wide ? "" : text);
  };

  /**
   * Takes the pin where the customer put it.
   *
   * A hand-placed pin carries no GPS doubt, so the warning goes with it. The
   * address lookup is rate-limited, so the naming waits until dragging stops.
   */
  const onMapMove = useCallback((latitude: number, longitude: number) => {
    setPin({ latitude, longitude });
    setCoarse(false);

    pending.current = { latitude, longitude };
    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      const target = pending.current;
      if (!target) return;

      void describeCoordinates(target.latitude, target.longitude).then(
        (label) => {
          // A later drag has already moved on, so this answer describes
          // somewhere the pin has left. And never overwrite what was typed.
          if (pending.current !== target || !label || edited.current) return;
          setPickup(label);
        },
      );
    }, 1200);
  }, []);

  const callDispatch = () => {
    confirm({
      title: t("home.ambulanceTitle"),
      message: t("home.ambulanceBody", { number: AMBULANCE_PHONE }),
      confirmLabel: t("home.ambulanceConfirm"),
      cancelLabel: t("common.cancel"),
      destructive: true,
      onConfirm: () => void Linking.openURL(`tel:${AMBULANCE_PHONE}`),
    });
  };

  return (
    <View className="gd-screen">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* The board sets this one title in emergency red. */}
        <ScreenHeader title={t("amb.title")} tone="emergency" />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gd-scroll-content"
          keyboardShouldPersistTaps="handled"
        >
          {/*
            First on the screen, because it is the thing the caller has to read
            out and the only thing here the app actually knows.
          */}
          <Text className="gd-section-title mt-0">{t("amb.pickup")}</Text>
          <View className="gd-search gd-addr-search">
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={20}
              color={colors.emergency}
            />
            <TextInput
              className="gd-search-input"
              value={pickup}
              onChangeText={(next) => {
                edited.current = true;
                setPickup(next);
                // Typed over: whatever the device guessed no longer applies.
                setCoarse(false);
              }}
              placeholder={t("amb.pickupPlaceholder")}
              placeholderTextColor={colors.inkFaint}
              multiline
            />
            {locating ? (
              <ActivityIndicator size="small" color={colors.emergency} />
            ) : (
              <Pressable
                style={pressSmall}
                onPress={() => void fillFromDevice()}
                accessibilityRole="button"
                accessibilityLabel={t("address.useCurrent")}
                hitSlop={8}
              >
                <MaterialCommunityIcons
                  name="crosshairs-gps"
                  size={20}
                  color={colors.emergency}
                />
              </Pressable>
            )}
          </View>
          <Text className={coarse ? "gd-amb-warn" : "gd-custom-note"}>
            {coarse ? t("amb.pickupCoarse") : t("amb.pickupHint")}
          </Text>

          {/*
            A real map, where an empty placeholder used to sit.

            It shows where the caller is, not where an ambulance is — the app
            knows the first and cannot know the second. That distinction is the
            whole reason the old box was blank, and drawing the caller's own
            position claims nothing the app cannot back.
          */}
          <MapPicker
            latitude={pin?.latitude ?? DEFAULT_CENTRE.latitude}
            longitude={pin?.longitude ?? DEFAULT_CENTRE.longitude}
            onMove={onMapMove}
          />
          <Text className="gd-map-hint">{t("amb.mapHint")}</Text>

          {/* Selectable, so the digits can be copied rather than transcribed. */}
          {pin ? (
            <Text className="gd-amb-coords" selectable>
              {t("amb.coords", {
                lat: pin.latitude.toFixed(5),
                lng: pin.longitude.toFixed(5),
              })}
            </Text>
          ) : null}

          <Text className="gd-section-title">{t("amb.tellThem")}</Text>
          <View className="gd-tell">
            {TELL_THEM.map((key, index) => (
              <View
                key={key}
                className={
                  index > 0 ? "gd-tell-row gd-tell-divider" : "gd-tell-row"
                }
              >
                <View className="gd-tell-num">
                  <Text className="gd-tell-num-text">{index + 1}</Text>
                </View>
                <Text className="gd-tell-text">{t(key)}</Text>
              </View>
            ))}
          </View>
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

          {/*
            Worth saying plainly. Fear of a bill is a real reason people put off
            calling an ambulance, and 108 does not send one.
          */}
          <Text className="gd-send-note">
            {t("amb.free", { number: AMBULANCE_PHONE })}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
