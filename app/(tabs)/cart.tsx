import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import clsx from "clsx";
import { useRouter, type Href } from "expo-router";
import { styled } from "nativewind";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { DELIVERY_FEE, useOrders } from "@/contexts/OrdersContext";
import "@/global.css";
import { pressRow, pressSmall } from "@/lib/press";
import { formatRupees } from "@/lib/utils";

const SafeAreaView = styled(RNSafeAreaView);

/** Cart — the basket behind board frame 06's docked bar. */
export default function Cart() {
  const { t } = useLanguage();
  const router = useRouter();
  const { lines, add, remove, clear, total, needsPharmacistReview } = useCart();
  const { place } = useOrders();

  const checkout = () => {
    const order = place(
      lines.map((line) => ({
        id: line.item.id,
        name: line.item.name,
        quantity: line.quantity,
        price: line.item.price * line.quantity,
      })),
      needsPharmacistReview,
    );
    clear();
    router.push(`/order/${order.id}` as Href);
  };

  return (
    <View className="gd-screen">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="gd-topbar">
          <Text className="gd-topbar-title">{t("cart.title")}</Text>
        </View>

        {lines.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
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
                        {t("cart.qty", { count: line.quantity })} ·{" "}
                        {formatRupees(line.item.price)}
                      </Text>
                    </View>

                    <Text className="gd-med-price">
                      {formatRupees(line.item.price * line.quantity)}
                    </Text>

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

              {/* Flagged before payment, not after — board frame 06's Rx tags. */}
              {needsPharmacistReview ? (
                <View className="gd-notice mt-3">
                  <MaterialCommunityIcons
                    name="information-outline"
                    size={18}
                    color={colors.emergency}
                  />
                  <Text className="gd-notice-text">{t("cart.rxNotice")}</Text>
                </View>
              ) : null}

              <View className="gd-totals">
                <View className="gd-total-row">
                  <Text className="gd-total-label">{t("cart.subtotal")}</Text>
                  <Text className="gd-total-value">{formatRupees(total)}</Text>
                </View>
                <View className="gd-total-row">
                  <Text className="gd-total-label">
                    {t("cart.deliveryFee")}
                  </Text>
                  <Text className="gd-total-value">
                    {formatRupees(DELIVERY_FEE)}
                  </Text>
                </View>
                <View className="gd-total-row gd-total-grand">
                  <Text className="gd-total-grand-label">
                    {t("cart.total")}
                  </Text>
                  <Text className="gd-total-grand-value">
                    {formatRupees(total + DELIVERY_FEE)}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View className="px-5 pb-3 pt-1">
              <Pressable
                className="gd-btn"
                style={pressRow}
                onPress={checkout}
                accessibilityRole="button"
              >
                <Text className="gd-btn-text">{t("cart.checkout")}</Text>
              </Pressable>
            </View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}
