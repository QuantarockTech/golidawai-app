import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import dayjs from "dayjs";
import { useRouter, type Href } from "expo-router";
import { styled } from "nativewind";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrders } from "@/contexts/OrdersContext";
import "@/global.css";
import { STATUS_LABEL_KEYS } from "@/lib/orderStatus";
import { pressRow } from "@/lib/press";
import { formatRupees } from "@/lib/utils";

const SafeAreaView = styled(RNSafeAreaView);

/** Orders list — the entry point to board frame 08. */
export default function Orders() {
  const { t } = useLanguage();
  const router = useRouter();
  const { orders } = useOrders();

  return (
    <View className="gd-screen">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="gd-topbar">
          <Text className="gd-topbar-title">{t("orders.title")}</Text>
        </View>

        {orders.length === 0 ? (
          <View className="gd-empty-screen">
            <MaterialCommunityIcons
              name="file-document-outline"
              size={44}
              color={colors.inkFaint}
            />
            <Text className="gd-empty-text mt-3">{t("orders.empty")}</Text>
            <Pressable
              className="gd-btn mt-5 w-full"
              style={pressRow}
              onPress={() => router.push("/order-medicines")}
              accessibilityRole="button"
            >
              <Text className="gd-btn-text">{t("orders.emptyAction")}</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerClassName="gd-scroll-content"
          >
            {orders.map((order) => (
              <Pressable
                key={order.id}
                className="gd-order-card"
                style={pressRow}
                onPress={() => router.push(`/order/${order.id}` as Href)}
                accessibilityRole="button"
              >
                <View className="min-w-0 flex-1">
                  <Text className="gd-order-id">#{order.id}</Text>
                  <Text className="gd-order-meta">
                    {t("orders.placedOn", {
                      date: dayjs(order.placedAt).format("D MMM, h:mm A"),
                    })}
                  </Text>
                  <Text className="gd-order-meta">
                    {t("orders.itemCount", { count: order.lines.length })} ·{" "}
                    {formatRupees(order.total)}
                  </Text>
                </View>

                <View className="items-end gap-1">
                  <View className="gd-order-status">
                    <Text className="gd-order-status-text">
                      {t(STATUS_LABEL_KEYS[order.status])}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={colors.inkFaint}
                  />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
