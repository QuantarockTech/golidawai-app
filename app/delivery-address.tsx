import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { styled } from "nativewind";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import AddressSearch from "@/components/AddressSearch";
import MapPicker from "@/components/MapPicker";
import ScreenHeader from "@/components/ScreenHeader";
import { colors } from "@/constants/theme";
import { useDelivery } from "@/contexts/DeliveryContext";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/global.css";
import { notify } from "@/lib/dialog";
import {
  DEFAULT_CENTRE,
  describeCoordinates,
  isCoarseFix,
  locateCurrentAddress,
  type LocateFailure,
} from "@/lib/location";
import { useGoBack } from "@/lib/nav";
import { pressRow } from "@/lib/press";
import { isPhoneLike } from "@/lib/auth";
import { useCustomer } from "@/lib/useCustomer";

const SafeAreaView = styled(RNSafeAreaView);

/**
 * Where the order goes.
 *
 * Two routes to the same answer, because neither works on its own: GPS gets a
 * rider to the right building far better than an Indore street address does,
 * but it cannot know the flat number, and it is useless indoors on a bad fix.
 * So the pin and the typed line coexist — the customer can take the pin and
 * still write "2nd floor, above the bakery" underneath it.
 */
export default function DeliveryAddressScreen() {
  const { t } = useLanguage();
  const goBack = useGoBack();
  const { address, save } = useDelivery();
  const { phone: savedPhone, savePhone } = useCustomer();

  const [phone, setPhone] = useState(savedPhone);
  const [text, setText] = useState(address?.text ?? "");
  const [pin, setPin] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    /** What the coordinates resolved to, so the row reads as a place. */
    label?: string;
    /** Set once the customer has moved the map themselves. */
    placed?: boolean;
  } | null>(
    address?.latitude != null && address?.longitude != null
      ? {
          latitude: address.latitude,
          longitude: address.longitude,
          ...(address.accuracy != null ? { accuracy: address.accuracy } : {}),
          // Only a located address was written by the geocoder; a typed one
          // belongs in the box below, not in the row describing the pin.
          ...(address.source !== "manual" && address.text
            ? { label: address.text }
            : {}),
          ...(address.source === "map" ? { placed: true } : {}),
        }
      : null,
  );
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  /*
   * Clerk's user arrives a beat after the screen does, so the field seeds
   * itself when the number turns up — but once only, or it would snatch back
   * whatever the customer had already started typing.
   */
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current || !savedPhone) return;
    seeded.current = true;
    setPhone(savedPhone);
  }, [savedPhone]);

  /*
   * The point the map is waiting to have named, and the timer that will do it.
   *
   * Dragging a map emits a settled position every time a finger lifts, and the
   * address lookup is allowed one request a second. So a move parks the
   * coordinates here and the naming happens once the customer stops fiddling.
   */
  const pendingLabel = useRef<{ latitude: number; longitude: number } | null>(
    null,
  );
  const labelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (labelTimer.current) clearTimeout(labelTimer.current);
    },
    [],
  );

  /**
   * Takes the pin where the customer put it.
   *
   * The GPS accuracy is dropped on purpose: it described how sure the device
   * was, and the device is no longer the one answering. A pin placed by someone
   * looking at their own roof is not uncertain, so the "rough area" warning has
   * to go with it.
   */
  const onMapMove = useCallback((latitude: number, longitude: number) => {
    setPin({ latitude, longitude, placed: true });

    pendingLabel.current = { latitude, longitude };
    if (labelTimer.current) clearTimeout(labelTimer.current);

    labelTimer.current = setTimeout(() => {
      const target = pendingLabel.current;
      if (!target) return;

      void describeCoordinates(target.latitude, target.longitude).then(
        (label) => {
          // Another drag may have landed while the lookup was in flight. Late
          // answers describe somewhere the pin has already left.
          if (pendingLabel.current !== target || !label) return;

          setPin((current) =>
            current &&
            current.latitude === target.latitude &&
            current.longitude === target.longitude
              ? { ...current, label }
              : current,
          );
        },
      );
    }, 1200);
  }, []);

  /**
   * A place taken from the search results.
   *
   * Counts as `placed`, the same as a map drag, because it is: the customer
   * named somewhere rather than letting a radio guess. That drops the accuracy
   * reading and the "rough area" warning along with it, which is right — the
   * doubt those describe belonged to the device.
   */
  const onSearchPick = useCallback(
    (place: { latitude: number; longitude: number; text: string }) => {
      pendingLabel.current = null;

      setPin({
        latitude: place.latitude,
        longitude: place.longitude,
        label: place.text,
        placed: true,
      });

      // Same rule as the locate button: never write over what was typed. A
      // colony name is a starting point, and the flat number is the part only
      // the customer has.
      setText((current) => (current.trim() ? current : place.text));
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

  const pickCurrentLocation = async () => {
    setLocating(true);
    const result = await locateCurrentAddress();
    setLocating(false);

    if (!result.ok) {
      notify(t("address.title"), failureMessage(result.reason), t("common.ok"));
      return;
    }

    const { latitude, longitude, accuracy, text: resolved } = result.address;

    // A lookup left over from a map drag would otherwise land on top of this
    // one and re-label a pin that has since moved somewhere else entirely.
    pendingLabel.current = null;

    setPin({
      latitude,
      longitude,
      ...(accuracy != null ? { accuracy } : {}),
      ...(resolved ? { label: resolved } : {}),
    });

    // Only fill the box if it's empty. Overwriting would wipe the flat number
    // and landmark the customer typed, which geocoding can never recover.
    //
    // A wide fix is left out of it entirely. "Indore City, Madhya Pradesh" in
    // the address box looks like an answered question, and the customer stops
    // typing at exactly the point where the useful half was about to go in.
    if (resolved && !isCoarseFix(accuracy) && !text.trim()) setText(resolved);
  };

  const onSave = async () => {
    const trimmed = text.trim();

    if (!trimmed && !pin) {
      notify(t("address.title"), t("address.needSomething"), t("common.ok"));
      return;
    }

    /*
     * Not optional, and checked before anything is written.
     *
     * The order leaves as a WhatsApp message into a thread nobody monitors for
     * replies. If the rider cannot find the door — which in Indore is most
     * deliveries — a number is the only thing standing between that and a
     * medicine order quietly not arriving.
     */
    if (!isPhoneLike(phone)) {
      notify(t("address.title"), t("address.phoneNeeded"), t("common.ok"));
      return;
    }

    setSaving(true);
    const stored = await savePhone(phone);
    setSaving(false);

    // The number lives on the Clerk user, so storing it is a network call. A
    // silent failure here would send the next order out without it.
    if (!stored) {
      notify(t("address.title"), t("address.phoneSaveFailed"), t("common.ok"));
      return;
    }

    save({
      text: trimmed,
      ...(pin
        ? {
            latitude: pin.latitude,
            longitude: pin.longitude,
            ...(pin.accuracy != null ? { accuracy: pin.accuracy } : {}),
          }
        : {}),
      source: pin ? (pin.placed ? "map" : "gps") : "manual",
      savedAt: new Date().toISOString(),
    });

    goBack();
  };

  return (
    <View className="gd-screen">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScreenHeader title={t("address.title")} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gd-scroll-content"
          keyboardShouldPersistTaps="handled"
        >
          {/*
            First on the screen, ahead of the address it belongs to. It is the
            one field here that is never optional, it takes ten keystrokes
            rather than a map drag, and a customer sent back to this screen for
            a missing number should not have to scroll past a map to find it.
          */}
          <Text className="gd-section-title mt-0">{t("address.phone")}</Text>
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
          <Text className="gd-custom-note">{t("address.phoneHint")}</Text>

          <Text className="gd-section-title">{t("address.where")}</Text>

          <AddressSearch onPick={onSearchPick} />

          <Text className="gd-search-or">{t("address.searchOr")}</Text>

          <Pressable
            className="gd-locate"
            style={pressRow}
            onPress={() => void pickCurrentLocation()}
            disabled={locating}
            accessibilityRole="button"
            accessibilityState={{ disabled: locating, busy: locating }}
          >
            {locating ? (
              <ActivityIndicator size="small" color={colors.brandDark} />
            ) : (
              <MaterialCommunityIcons
                name="crosshairs-gps"
                size={20}
                color={colors.brandDark}
              />
            )}
            <View className="min-w-0 flex-1">
              <Text className="gd-locate-title">
                {locating ? t("address.locating") : t("address.useCurrent")}
              </Text>
              <Text className="gd-locate-hint">{t("address.useCurrentHint")}</Text>
            </View>
          </Pressable>

          {pin ? (
            <View className="gd-address mt-2.5">
              <MaterialCommunityIcons
                name="map-marker-check-outline"
                size={20}
                color={colors.brandDark}
              />
              <View className="min-w-0 flex-1">
                <Text className="gd-address-text">
                  {pin.label
                    ? isCoarseFix(pin.accuracy)
                      ? t("address.pinNear", { place: pin.label })
                      : pin.label
                    : t("address.pinSet", {
                        lat: pin.latitude.toFixed(5),
                        lng: pin.longitude.toFixed(5),
                      })}
                </Text>
                {isCoarseFix(pin.accuracy) ? (
                  <Text className="gd-locate-hint">
                    {t("address.pinCoarse")}
                  </Text>
                ) : pin.accuracy != null ? (
                  <Text className="gd-locate-hint">
                    {t("address.pinAccuracy", {
                      metres: Math.round(pin.accuracy),
                    })}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => setPin(null)}
                accessibilityRole="button"
                accessibilityLabel={t("address.removePin")}
                hitSlop={8}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={18}
                  color={colors.inkFaint}
                />
              </Pressable>
            </View>
          ) : null}

          {/*
            Always on screen, pin or no pin. Search cannot name every house in
            Indore and the device cannot find one indoors, so the map is the
            one route to an address that never fails — which makes hiding it
            until something else succeeded exactly backwards. With nothing
            found yet it opens on the middle of the city, and one drag is the
            whole interaction.
          */}
          <MapPicker
            latitude={pin?.latitude ?? DEFAULT_CENTRE.latitude}
            longitude={pin?.longitude ?? DEFAULT_CENTRE.longitude}
            onMove={onMapMove}
          />
          <Text className="gd-map-hint">
            {pin ? t("address.mapHint") : t("address.mapHintEmpty")}
          </Text>

          <Text className="gd-section-title">{t("address.manual")}</Text>
          <TextInput
            className="gd-textarea"
            value={text}
            onChangeText={setText}
            placeholder={t("address.manualPlaceholder")}
            placeholderTextColor={colors.inkFaint}
            multiline
            textAlignVertical="top"
          />
          <Text className="gd-custom-note">{t("address.manualHint")}</Text>

          <Pressable
            className="gd-btn mt-5"
            style={pressRow}
            onPress={() => void onSave()}
            disabled={saving}
            accessibilityRole="button"
            accessibilityState={{ disabled: saving, busy: saving }}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.mist} />
            ) : (
              <Text className="gd-btn-text">{t("address.save")}</Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
