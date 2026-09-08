import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { clsx } from "clsx";
import dayjs from "dayjs";
import { useLocalSearchParams } from "expo-router";
import { styled } from "nativewind";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import ScreenHeader from "@/components/ScreenHeader";
import { PHARMACY_PHONE, WHATSAPP_NUMBER } from "@/constants/data";
import { colors } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrders } from "@/contexts/OrdersContext";
import "@/global.css";
import { KIND_LABELS } from "@/lib/orderKind";
import { pressRow } from "@/lib/press";
import { printOrder } from "@/lib/printOrder";

const SafeAreaView = styled(RNSafeAreaView);

/**
 * What was sent, and where to follow it up.
 *
 * There is no tracker here because there is nothing to track: the order lives
 * in a WhatsApp thread the moment it leaves, and no part of this app can learn
 * that it was packed or dispatched. Showing a plausible-looking status would be
 * inventing one. Instead the screen shows the customer exactly what they asked
 * for and hands them the two ways to chase it.
 */
export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const { find } = useOrders();

  const order = id ? find(id) : undefined;

  if (!order) {
    return (
      <View className="gd-screen">
        <SafeAreaView className="flex-1" edges={["top"]}>
          <ScreenHeader title={t("orders.title")} />
          <View className="gd-empty-screen">
            <Text className="gd-empty-text">{t("orders.empty")}</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="gd-screen">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScreenHeader title={t("orderDetail.title", { id: order.id })} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gd-scroll-content"
        >
          <View className="gd-sent-banner">
            <MaterialCommunityIcons
              name="whatsapp"
              size={20}
              color={colors.brandDark}
            />
            <View className="min-w-0 flex-1">
              <Text className="gd-sent-title">
                {t("orderDetail.sentVia", {
                  kind: t(KIND_LABELS[order.kind]),
                })}
              </Text>
              <Text className="gd-locate-hint">
                {t("orders.sentOn", {
                  date: dayjs(order.sentAt).format("D MMM, h:mm A"),
                })}
              </Text>
            </View>
          </View>

          <Text className="gd-custom-note">{t("orderDetail.noTracking")}</Text>

          {order.lines.length > 0 ? (
            <>
              <Text className="gd-section-title">{t("order.summary")}</Text>
              <View className="gd-med-card">
                {order.lines.map((line, index) => (
                  <View
                    key={line.id}
                    className={clsx("gd-med-row", index > 0 && "gd-med-divider")}
                  >
                    <View className="min-w-0 flex-1">
                      <Text className="gd-med-name" numberOfLines={1}>
                        {line.name}
                      </Text>
                      <Text className="gd-med-sub">
                        {t("cart.qty", { count: line.quantity })}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {order.typedItems.length > 0 ? (
            <>
              <Text className="gd-section-title">{t("order.customTitle")}</Text>
              <View className="gd-med-card">
                {order.typedItems.map((item, index) => (
                  <View
                    key={`${item.name}-${index}`}
                    className={clsx("gd-med-row", index > 0 && "gd-med-divider")}
                  >
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
            </>
          ) : null}

          {order.prescriptionCount > 0 ? (
            <View className="gd-address mt-4">
              <MaterialCommunityIcons
                name="file-image-outline"
                size={20}
                color={colors.brandDark}
              />
              <Text className="gd-address-text">
                {t("orders.rxCount", { count: order.prescriptionCount })}
              </Text>
            </View>
          ) : null}

          <Text className="gd-section-title">{t("rx.deliverTo")}</Text>
          <View className="gd-address">
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={20}
              color={colors.brandDark}
            />
            <Text className="gd-address-text">
              {order.deliveryText || t("address.pinOnly")}
            </Text>
          </View>

          <Text className="gd-section-title">{t("orderDetail.followUp")}</Text>

          <Pressable
            className="gd-btn-whatsapp"
            style={pressRow}
            onPress={() =>
              void Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}`)
            }
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="whatsapp" size={20} color="#ffffff" />
            <Text className="gd-btn-whatsapp-text">
              {t("orderDetail.openChat")}
            </Text>
          </Pressable>

          <Pressable
            className="gd-link-row"
            style={pressRow}
            onPress={() => void Linking.openURL(`tel:${PHARMACY_PHONE}`)}
            accessibilityRole="button"
          >
            <Text className="gd-link">{t("orderDetail.callInstead")} →</Text>
          </Pressable>

          {/*
            Both platforms, from one document. Chrome's dialog and Android's
            both carry "Save as PDF", so this reaches a real file without the
            app writing one — see lib/orderSheet.ts for the page itself.
          */}
          <Pressable
            className="gd-link-row"
            style={pressRow}
            onPress={() => void printOrder(order)}
            accessibilityRole="button"
          >
            <Text className="gd-link">{t("orderDetail.print")} →</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
