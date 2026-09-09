import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { clsx } from "clsx";
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
import MapPreview from "@/components/MapPreview";
import ScreenHeader from "@/components/ScreenHeader";
import { colors } from "@/constants/theme";
import { useDelivery } from "@/contexts/DeliveryContext";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/global.css";
import { notify } from "@/lib/dialog";
import type { TranslationKey } from "@/lib/i18n/translations";
import {
  isCoarseFix,
  locateCurrentAddress,
  type LocateFailure,
} from "@/lib/location";
import { useGoBack } from "@/lib/nav";
import { pressRow } from "@/lib/press";
import { isPhoneLike } from "@/lib/auth";
import { useCustomer } from "@/lib/useCustomer";

const SafeAreaView = styled(RNSafeAreaView);

const ADDRESS_LABELS: {
  key: AddressLabel;
  icon: string;
  labelKey: TranslationKey;
}[] = [
  { key: "house", icon: "home-outline", labelKey: "address.labelHouse" },
  { key: "office", icon: "briefcase-outline", labelKey: "address.labelOffice" },
  { key: "other", icon: "map-marker-outline", labelKey: "address.labelOther" },
];

/**
 * Where the order goes.
 *
 * Three routes to the same answer, because none works on its own: search knows
 * the colony but not the building, GPS gets a rider closer than an Indore street
 * address does but is useless indoors on a bad fix, and neither can ever know
 * the flat number. So a point and a typed line coexist — take the point from
 * whichever route worked, then write "2nd floor, above the bakery" underneath.
 *
 * The map here confirms rather than collects. It is Google's own embed, which
 * cannot be read back out of (see `mapsEmbedUrl`), so it answers "is this
 * roughly right?" — a question the customer can settle by reading the road
 * names off it — and the flat number below answers the rest.
 */
export default function DeliveryAddressScreen() {
  const { t } = useLanguage();
  const goBack = useGoBack();
  const { address, save, isLoaded } = useDelivery();
  const { phone: savedPhone, savePhone } = useCustomer();

  const [phone, setPhone] = useState(savedPhone);
  /*
   * Split three ways, by who owns each part.
   *
   * `area` belongs to the app and is replaced every time the location changes.
   * `flat` and `landmark` belong to the customer and are never written over.
   * An older address saved before this split carries only `text`, so it seeds
   * whichever field it actually came from — see the migration in
   * DeliveryContext for the same reasoning.
   */
  const [area, setArea] = useState(address?.area ?? "");
  const [flat, setFlat] = useState(address?.flat ?? "");
  const [building, setBuilding] = useState(address?.building ?? "");
  const [landmark, setLandmark] = useState(address?.landmark ?? "");
  const [label, setLabel] = useState<AddressLabel>(address?.label ?? "house");

  /*
   * Two steps, the way every delivery app in India does it.
   *
   * Choosing where you are and describing your door are different jobs, and a
   * single scrolling form asked the customer to do both at once — which is how
   * a locality string ended up looking like something to correct by hand. The
   * location is settled first, and the details form then treats it as given
   * with a "Change" button rather than an editable field.
   *
   * Opens on the details step when an address is already saved: someone who
   * came here to fix a flat number should not have to re-confirm a location
   * that was right all along.
   */
  const [step, setStep] = useState<"location" | "details">("location");
  const [pin, setPin] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    /** What the coordinates resolved to, so the row reads as a place. */
    label?: string;
    /** Set when the customer named the place rather than a radio guessing it. */
    chosen?: boolean;
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
          ...(address.source === "search" ? { chosen: true } : {}),
        }
      : null,
  );
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  /** The two things a rider cannot arrive without. Mirrors the check in onSave. */
  const canSave = Boolean(flat.trim()) && isPhoneLike(phone) && !saving;

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

  /**
   * Fills the form from the address already saved on this device.
   *
   * The state above is seeded from `address` at first render, and at first
   * render there is no address to seed from: DeliveryProvider reads it out of
   * storage asynchronously, so the first pass always sees null. The effect is
   * what actually loads a saved address — without it the screen opened blank
   * every time and quietly offered to replace what was there with nothing.
   *
   * Runs on `isLoaded` rather than on `address`, so a customer with no saved
   * address is settled too, and only once, so nothing typed here is undone by
   * a later write.
   */
  const filled = useRef(false);

  useEffect(() => {
    if (filled.current || !isLoaded) return;
    filled.current = true;

    if (!address) return;

    setArea(address.area ?? "");
    setFlat(address.flat ?? "");
    setBuilding(address.building ?? "");
    setLandmark(address.landmark ?? "");
    if (address.label) setLabel(address.label);

    // Straight to the details for an address that already has a location.
    if (address.area) setStep("details");

    if (address.latitude != null && address.longitude != null) {
      setPin({
        latitude: address.latitude,
        longitude: address.longitude,
        ...(address.accuracy != null ? { accuracy: address.accuracy } : {}),
        ...(address.source !== "manual" && address.text
          ? { label: address.text }
          : {}),
        ...(address.source === "search" ? { chosen: true } : {}),
      });
    }
  }, [isLoaded, address]);

  /**
   * A place taken from the search results.
   *
   * Counts as `chosen`, because it is: the customer named somewhere rather than
   * letting a radio guess. That drops the accuracy reading and the "rough area"
   * warning along with it, which is right — the doubt those describe belonged
   * to the device, and the device is no longer the one answering.
   */
  const onSearchPick = useCallback(
    (place: { latitude: number; longitude: number; text: string }) => {
      setPin({
        latitude: place.latitude,
        longitude: place.longitude,
        label: place.text,
        chosen: true,
      });

      // Replaced outright, not merged. The customer just named somewhere else,
      // so the previous area is wrong — and their flat number, which sits in
      // its own field now, is untouched by this.
      setArea(place.text);
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

    setPin({
      latitude,
      longitude,
      ...(accuracy != null ? { accuracy } : {}),
      ...(resolved ? { label: resolved } : {}),
    });

    /*
     * The area is now this button's to set, so it is set — every time.
     *
     * It used to fill the box only when empty, which is what left a customer
     * looking at their old address above a map of where they actually were.
     * Overwriting is safe here precisely because the flat number and landmark
     * live in their own fields below and this cannot touch them.
     *
     * A wide fix is still left out. "Indore City, Madhya Pradesh" reads like an
     * answered question, and the customer stops typing at exactly the point
     * where the useful half was about to go in.
     */
    if (resolved && !isCoarseFix(accuracy)) setArea(resolved);
  };

  const onSave = async () => {
    const parts = {
      area: area.trim(),
      flat: flat.trim(),
      building: building.trim(),
      landmark: landmark.trim(),
    };

    /*
     * One line for the message and the order history, narrowest first — the
     * order a person reads an address in, and the order a rider needs it.
     */
    const trimmed = [parts.flat, parts.building, parts.area, parts.landmark]
      .filter(Boolean)
      .join(", ");

    if (!trimmed && !pin) {
      notify(t("address.title"), t("address.needSomething"), t("common.ok"));
      return;
    }

    /*
     * The one field the geocoder can never supply, so the one this screen has
     * to insist on. A rider with a locality and no flat number is standing in
     * the right colony ringing the customer to ask which building.
     */
    if (!parts.flat) {
      notify(t("address.title"), t("address.flatNeeded"), t("common.ok"));
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
      ...(parts.area ? { area: parts.area } : {}),
      ...(parts.flat ? { flat: parts.flat } : {}),
      ...(parts.building ? { building: parts.building } : {}),
      ...(parts.landmark ? { landmark: parts.landmark } : {}),
      label,
      ...(pin
        ? {
            latitude: pin.latitude,
            longitude: pin.longitude,
            ...(pin.accuracy != null ? { accuracy: pin.accuracy } : {}),
          }
        : {}),
      source: pin ? (pin.chosen ? "search" : "gps") : "manual",
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
          contentContainerClassName="gd-scroll-content gd-scroll-flush"
          keyboardShouldPersistTaps="handled"
        >
          {step === "location" ? (
          <>
          <Text className="gd-section-title mt-0">{t("address.where")}</Text>

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
            Only once there is a point to show. An empty map centred on the
            middle of Indore used to be worth drawing because the customer
            could drag it; this one cannot be dragged, so with nothing found
            yet it would be a picture of Rajwada above a form about somewhere
            else — decoration that reads as an answer.
          */}
          {pin ? (
            <>
              <MapPreview
                latitude={pin.latitude}
                longitude={pin.longitude}
                label={pin.label}
              />
              <Text className="gd-map-hint">{t("address.mapHint")}</Text>
            </>
          ) : null}

          {/*
            Ends the location step rather than saving. Nothing here is enough
            to deliver to on its own — the flat number is still missing — so
            this reads as "carry on", not "done".
          */}
          <Pressable
            className={clsx("gd-btn mt-5", !area.trim() && "gd-btn-disabled")}
            style={pressRow}
            onPress={() => setStep("details")}
            disabled={!area.trim()}
            accessibilityRole="button"
            accessibilityState={{ disabled: !area.trim() }}
          >
            <Text className="gd-btn-text">{t("address.confirmLocation")}</Text>
          </Pressable>
          </>
          ) : (
          <>
          {/*
            The chosen location, editable.

            It was read-only at first, on Swiggy's reasoning: the string comes
            from a geocoder and belongs to the map, so the way to correct it is
            to pick a different point. That reasoning assumes the geocoder is
            right about the place once the point is right, and here it is not —
            across most of Indore it returns a colony and a pincode at best,
            and sometimes somebody else's plot number. A customer who can see
            it is wrong should be able to say so.

            "Change" still goes back to the map, because moving the point is a
            different act from fixing its name — and only the map can move the
            coordinates the rider actually navigates by.
          */}
          <View className="gd-locality-head">
            <Text className="gd-section-title mt-0">{t("address.area")}</Text>
            <Pressable
              className="gd-locality-change"
              style={pressRow}
              onPress={() => setStep("location")}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={16}
                color={colors.brandDark}
              />
              <Text className="gd-locality-change-text">
                {t("address.change")}
              </Text>
            </Pressable>
          </View>
          <TextInput
            className="gd-input-line"
            value={area}
            onChangeText={setArea}
            placeholder={t("address.areaPlaceholder")}
            placeholderTextColor={colors.inkFaint}
          />

          {/* What kind of place this is. A note for the rider, not a chooser. */}
          <Text className="gd-section-title">{t("address.labelTitle")}</Text>
          <View className="gd-chips-row">
            {ADDRESS_LABELS.map((option) => {
              const active = label === option.key;
              return (
                <Pressable
                  key={option.key}
                  className={clsx("gd-chip", active && "gd-chip-active")}
                  style={pressRow}
                  onPress={() => setLabel(option.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <MaterialCommunityIcons
                    name={option.icon as never}
                    size={15}
                    color={active ? colors.brandInk : colors.inkMuted}
                  />
                  <Text
                    className={clsx(
                      "gd-chip-text",
                      active && "gd-chip-text-active",
                    )}
                  >
                    {t(option.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/*
            The parts only the customer has. Nothing the app learns about their
            coordinates may touch these, which is what lets the locality above
            be replaced freely by picking a different point.
          */}
          <Text className="gd-section-title">{t("address.flat")}</Text>
          <TextInput
            className="gd-input-line"
            value={flat}
            onChangeText={setFlat}
            placeholder={t("address.flatPlaceholder")}
            placeholderTextColor={colors.inkFaint}
          />

          <Text className="gd-section-title">{t("address.building")}</Text>
          <TextInput
            className="gd-input-line"
            value={building}
            onChangeText={setBuilding}
            placeholder={t("address.buildingPlaceholder")}
            placeholderTextColor={colors.inkFaint}
          />

          {/*
            Kept on this step rather than the first one. It belongs to the
            customer, like the two fields above, and a number asked for before
            the address is a question about something else entirely.
          */}
          <Text className="gd-section-title">{t("address.phone")}</Text>
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

          <Text className="gd-section-title">{t("address.landmark")}</Text>
          <TextInput
            className="gd-textarea"
            value={landmark}
            onChangeText={setLandmark}
            placeholder={t("address.landmarkPlaceholder")}
            placeholderTextColor={colors.inkFaint}
            multiline
            textAlignVertical="top"
          />
          <Text className="gd-custom-note">{t("address.manualHint")}</Text>

          {/*
            Greyed until the address could actually be delivered to, the way
            Swiggy's is. The flat number and a number to ring are the two
            things a rider cannot do without, and letting someone save without
            them only moves the failure to the doorstep.
          */}
          <Pressable
            className={clsx("gd-btn mt-5", !canSave && "gd-btn-disabled")}
            style={pressRow}
            onPress={() => void onSave()}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave, busy: saving }}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.mist} />
            ) : (
              <Text className="gd-btn-text">{t("address.save")}</Text>
            )}
          </Pressable>
          </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
