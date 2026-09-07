import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { clsx } from "clsx";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { styled } from "nativewind";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import DeliveryCard from "@/components/DeliveryCard";
import OrderOptions from "@/components/OrderOptions";
import { colors } from "@/constants/theme";
import { useCart } from "@/contexts/CartContext";
import { describeAddress, useDelivery } from "@/contexts/DeliveryContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrderDraft } from "@/contexts/OrderDraftContext";
import { useOrderPrefs } from "@/contexts/OrderPrefsContext";
import { useOrders } from "@/contexts/OrdersContext";
import "@/global.css";
import { notify } from "@/lib/dialog";
import {
  LINK_LIFETIME_DAYS,
  canUploadImages,
  uploadPrescriptionImages,
} from "@/lib/imgbb";
import { orderKindOf } from "@/lib/orderKind";
import { pressRow, pressSmall } from "@/lib/press";
import { useCustomer } from "@/lib/useCustomer";
import { useOrderReady } from "@/lib/useOrderReady";
import { buildOrderMessage, openWhatsAppWith } from "@/lib/whatsapp";

const SafeAreaView = styled(RNSafeAreaView);

/**
 * Cart — the basket behind board frame 06's docked bar, and the only way out.
 *
 * Every part of an order converges here: catalogue items, medicines typed by
 * hand, and photographed prescriptions. The other two screens collect and hand
 * over; this one sends. That is the whole point — a customer with all three
 * used to send three WhatsApp messages carrying three Ref numbers to the same
 * address, and nothing told the pharmacy they were one delivery.
 */
export default function Cart() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { lines, add, remove, clear, needsPharmacistReview } = useCart();
  const { typedItems, photos, notes, clear: clearDraft } = useOrderDraft();
  const { nextId, record } = useOrders();
  const { address } = useDelivery();
  const customer = useCustomer();
  const orderReady = useOrderReady();
  const { prefs, clearUrgent } = useOrderPrefs();

  const [sending, setSending] = useState(false);

  const isEmpty =
    lines.length === 0 && typedItems.length === 0 && photos.length === 0;

  /**
   * Hands the whole basket to WhatsApp, as one message.
   *
   * Nothing is placed here — there is no payment step and no server to place it
   * on. The app writes the order out, WhatsApp carries it, and the pharmacy
   * confirms stock and price in the reply. The basket is only emptied once
   * WhatsApp actually opened, so a failed handover doesn't lose it.
   */
  const sendToWhatsApp = async () => {
    if (!orderReady(t("cart.title"))) return;

    const orderLines: OrderLine[] = lines.map((line) => ({
      id: line.item.id,
      name: line.item.name,
      quantity: line.quantity,
    }));

    /*
     * Prescriptions are uploaded here rather than when they were photographed.
     * A wa.me link carries text and nothing else, so the images have to exist
     * at a URL before the message can point at them — and doing it once, at
     * send, means nothing is uploaded for an order the customer abandons.
     */
    let links: string[] = [];
    let failedUploads = 0;

    if (photos.length > 0) {
      if (!canUploadImages()) {
        notify(t("cart.title"), t("rx.uploadUnconfigured"), t("common.ok"));
        return;
      }

      setSending(true);
      const { urls, failed } = await uploadPrescriptionImages(
        photos.map((photo) => photo.base64),
      );
      setSending(false);

      // Every photo failed. Sending a prescription order with no prescription
      // in it wastes the pharmacy's time and the customer's.
      if (urls.length === 0) {
        notify(t("cart.title"), t("rx.uploadFailed"), t("common.ok"));
        return;
      }

      links = urls;
      failedUploads = failed;
    }

    const id = nextId();
    const kind = orderKindOf({
      lines: orderLines.length,
      typedItems: typedItems.length,
      prescriptions: links.length,
    });

    const opened = await openWhatsAppWith(
      buildOrderMessage({
        id,
        kind,
        customer,
        language,
        prefs,
        delivery: address,
        ...(orderLines.length ? { lines: orderLines } : {}),
        ...(typedItems.length ? { typedItems } : {}),
        ...(links.length
          ? { prescriptionLinks: links, prescriptionsMissing: failedUploads }
          : {}),
        ...(notes.trim() ? { notes } : {}),
      }),
    );

    if (!opened) {
      notify(t("cart.title"), t("whatsapp.openFailed"), t("common.ok"));
      return;
    }

    record({
      id,
      kind,
      lines: orderLines,
      typedItems,
      prescriptionCount: links.length,
      deliveryText: describeAddress(address),
      needsPharmacistReview: needsPharmacistReview || links.length > 0,
    });

    clear();
    clearDraft();
    // Urgency described this order, not the next one.
    clearUrgent();

    if (links.length > 0) {
      notify(
        t("rx.sentTitle"),
        failedUploads > 0
          ? t("rx.sentPartial", { sent: links.length, failed: failedUploads })
          : t("rx.sentBody", { days: LINK_LIFETIME_DAYS }),
        t("common.ok"),
      );
    }
  };

  return (
    <View className="gd-screen">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="gd-topbar">
          <Text className="gd-topbar-title">{t("cart.title")}</Text>
        </View>

        {isEmpty ? (
          <View className="gd-empty-screen">
            <MaterialCommunityIcons
              name="cart-outline"
              size={44}
              color={colors.inkFaint}
            />
            <Text className="gd-empty-text mt-3">{t("cart.empty")}</Text>
            <Pressable
              className="gd-btn mt-5 w-full"
              style={pressRow}
              onPress={() => router.push("/order-medicines")}
              accessibilityRole="button"
            >
              <Text className="gd-btn-text">{t("cart.emptyAction")}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerClassName="gd-scroll-content"
            >
              {lines.length > 0 ? (
              <View className="gd-med-card">
                {lines.map((line, index) => (
                  <View
                    key={line.item.id}
                    className={clsx(
                      "gd-med-row",
                      index > 0 && "gd-med-divider",
                    )}
                  >
                    <View className="gd-med-thumb">
                      <MaterialCommunityIcons
                        name="pill"
                        size={20}
                        color={colors.brandDark}
                      />
                    </View>

                    <View className="min-w-0 flex-1">
                      <Text className="gd-med-name" numberOfLines={1}>
                        {line.item.name}
                      </Text>
                      <Text className="gd-med-sub">
                        {t("cart.qty", { count: line.quantity })}
                      </Text>
                    </View>

                    <View className="gd-stepper">
                      <Pressable
                        className="gd-stepper-btn"
                        style={pressSmall}
                        onPress={() => remove(line.item.id)}
                        accessibilityRole="button"
                        accessibilityLabel={t("home.removeFromCart", {
                          name: line.item.name,
                        })}
                        hitSlop={8}
                      >
                        <MaterialCommunityIcons
                          name={
                            line.quantity === 1 ? "trash-can-outline" : "minus"
                          }
                          size={16}
                          color={colors.brandDark}
                        />
                      </Pressable>
                      <Text className="gd-stepper-count">{line.quantity}</Text>
                      <Pressable
                        className="gd-stepper-btn"
                        style={pressSmall}
                        onPress={() => add(line.item)}
                        accessibilityRole="button"
                        accessibilityLabel={t("home.addToCart", {
                          name: line.item.name,
                        })}
                        hitSlop={8}
                      >
                        <MaterialCommunityIcons
                          name="plus"
                          size={16}
                          color={colors.brandDark}
                        />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
              ) : null}

              {/*
                Medicines the catalogue doesn't stock, typed on the order
                screen. No price and no stepper, because nothing here has been
                matched to stock — the pharmacist quotes them in the reply.
              */}
              {typedItems.length > 0 ? (
                <>
                  <Text className="gd-section-title">{t("cart.typed")}</Text>
                  <View className="gd-med-card">
                    {typedItems.map((item, index) => (
                      <View
                        key={`${item.name}-${index}`}
                        className={clsx(
                          "gd-med-row",
                          index > 0 && "gd-med-divider",
                        )}
                      >
                        <View className="gd-med-thumb">
                          <MaterialCommunityIcons
                            name="pencil-outline"
                            size={18}
                            color={colors.brandDark}
                          />
                        </View>
                        <View className="min-w-0 flex-1">
                          <Text className="gd-med-name" numberOfLines={2}>
                            {item.name}
                          </Text>
                          <Text className="gd-med-sub">
                            {t("cart.qty", { count: item.quantity })}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                  <Text className="gd-custom-note">{t("cart.typedNote")}</Text>
                </>
              ) : null}

              {photos.length > 0 ? (
                <>
                  <Text className="gd-section-title">
                    {t("cart.prescriptions", { count: photos.length })}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {photos.map((photo) => (
                      <Image
                        key={photo.uri}
                        source={{ uri: photo.uri }}
                        style={{ width: 72, height: 72, borderRadius: 12 }}
                        contentFit="cover"
                      />
                    ))}
                  </View>
                  <Text className="gd-custom-note">{t("cart.rxNote")}</Text>
                </>
              ) : null}

              {/*
                No totals. Every figure the app could put here came from a
                catalogue price nothing had checked against stock or the day's
                MRP, and the customer read it as the bill. The pharmacy quotes
                on WhatsApp, which is the only quote that was ever binding.
              */}
              <Text className="gd-custom-note">{t("cart.quoteNote")}</Text>

              <DeliveryCard />


              <OrderOptions />
            </ScrollView>

            <View className="px-5 pb-3 pt-1">
              <Pressable
                className="gd-btn-whatsapp"
                style={pressRow}
                onPress={() => void sendToWhatsApp()}
                disabled={sending}
                accessibilityRole="button"
                accessibilityState={{ disabled: sending, busy: sending }}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <MaterialCommunityIcons
                    name="whatsapp"
                    size={20}
                    color="#ffffff"
                  />
                )}
                <Text className="gd-btn-whatsapp-text">
                  {sending ? t("rx.uploading") : t("cart.checkout")}
                </Text>
              </Pressable>
              <Text className="gd-send-note">{t("cart.checkoutNote")}</Text>
            </View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}
