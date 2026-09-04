import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import clsx from "clsx";
import dayjs from "dayjs";
import { useLocalSearchParams } from "expo-router";
import { styled } from "nativewind";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import ScreenHeader from "@/components/ScreenHeader";
import { colors } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { STATUS_SEQUENCE, useOrders } from "@/contexts/OrdersContext";
import "@/global.css";
import { STATUS_LABEL_KEYS } from "@/lib/orderStatus";
import { pressRow } from "@/lib/press";
import { formatRupees } from "@/lib/utils";

const SafeAreaView = styled(RNSafeAreaView);

/** Checkout & Tracking — concept board frame 08. */
export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const { find, advance } = useOrders();

  const order = id ? find(id) : undefined;

  if (!order) {
    return (
      <View className="gd-screen">
        <SafeAreaView className="flex-1" edges={["top"]}>
          <ScreenHeader title={t("orders.title")} />
          <View className="flex-1 items-center justify-center px-8">
            <Text className="gd-empty-text">{t("orders.empty")}</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const reachedIndex = STATUS_SEQUENCE.indexOf(order.status);
  const goods = order.total - order.deliveryFee;
  // The board quotes a delivery window; 45 minutes from placing matches it.
  const arrivingBy = dayjs(order.placedAt).add(45, "minute").format("h:mm A");

  return (
    <View className="gd-screen">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScreenHeader title={t("orderDetail.title", { id: order.id })} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gd-scroll-content"
        >
          {/* Four-step tracker — the board reuses this for ambulance trips. */}
          <View className="gd-stepper-track">
            {STATUS_SEQUENCE.map((status, index) => {
              const done = index <= reachedIndex;
              return (
                <View key={status} className="gd-step">
                  {index > 0 ? (
                    <View
                      className={clsx(
                        "gd-step-line",
                        done && "gd-step-line-done",
                      )}
                    />
                  ) : null}
                  <View
                    className={clsx("gd-step-dot", done && "gd-step-dot-done")}
                  >
                    {done ? (
                      <MaterialCommunityIcons
                        name="check"
                        size={11}
                        color={colors.brandInk}
                      />
                    ) : null}
                  </View>
                  <Text className="gd-step-label" numberOfLines={2}>
                    {t(STATUS_LABEL_KEYS[status])}
                  </Text>
                </View>
              );
            })}
          </View>

          <View className="gd-eta">
            <Text className="gd-eta-title">
              {t("order.arriving", { time: arrivingBy })}
            </Text>
            <Text className="gd-eta-body">{t("order.riderAway")}</Text>
          </View>

          {order.needsPharmacistReview ? (
            <View className="gd-notice mt-3">
              <MaterialCommunityIcons
                name="information-outline"
                size={18}
                color={colors.emergency}
              />
              <Text className="gd-notice-text">{t("order.rxReview")}</Text>
            </View>
          ) : null}

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
                <Text className="gd-med-price">{formatRupees(line.price)}</Text>
              </View>
            ))}
          </View>

          <View className="gd-totals">
            <View className="gd-total-row">
              <Text className="gd-total-label">{t("cart.subtotal")}</Text>
              <Text className="gd-total-value">{formatRupees(goods)}</Text>
            </View>
            <View className="gd-total-row">
              <Text className="gd-total-label">{t("cart.deliveryFee")}</Text>
              <Text className="gd-total-value">
                {formatRupees(order.deliveryFee)}
              </Text>
            </View>
            <View className="gd-total-row gd-total-grand">
              <Text className="gd-total-grand-label">{t("cart.total")}</Text>
              <Text className="gd-total-grand-value">
                {formatRupees(order.total)}
              </Text>
            </View>
          </View>

          <Text className="gd-section-title">{t("order.payment")}</Text>
          <View className="gd-address">
            <MaterialCommunityIcons
              name="wallet-outline"
              size={20}
              color={colors.brandDark}
            />
            <Text className="gd-address-text">{t("order.paymentMethod")}</Text>
          </View>

          {/*
           * Stands in for the status pushes a real backend would send. Labelled
           * as a demo so it is never mistaken for a customer-facing control.
           */}
          {reachedIndex < STATUS_SEQUENCE.length - 1 ? (
            <Pressable
              className="gd-link-row mt-5"
              style={pressRow}
              onPress={() => advance(order.id)}
              accessibilityRole="button"
            >
              <Text className="gd-link">{t("order.advance")} →</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
