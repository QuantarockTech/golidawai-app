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
import { KIND_LABELS } from "@/lib/orderKind";
import { pressRow } from "@/lib/press";

const SafeAreaView = styled(RNSafeAreaView);

/**
 * What this phone has sent to the pharmacy.
 *
 * A record, not a tracker. The order lives in a WhatsApp thread once it leaves,
 * and nothing here can know whether it was packed or delivered — so the screen
 * shows what was asked for and when, and points at WhatsApp for the rest.
 */
export default function Orders() {
  const { t } = useLanguage();
  const router = useRouter();
  const { orders } = useOrders();

  const summarise = (order: SentOrder): string => {
    const parts: string[] = [];

    if (order.lines.length > 0) {
      parts.push(t("orders.itemCount", { count: order.lines.length }));
    }
    if (order.typedItems.length > 0) {
      parts.push(t("orders.typedCount", { count: order.typedItems.length }));
    }
    if (order.prescriptionCount > 0) {
      parts.push(t("orders.rxCount", { count: order.prescriptionCount }));
    }

    return parts.join(" · ");
  };

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
            <Text className="gd-custom-note mt-0">{t("orders.localNote")}</Text>

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
                    {t("orders.sentOn", {
                      date: dayjs(order.sentAt).format("D MMM, h:mm A"),
                    })}
                  </Text>
                  <Text className="gd-order-meta">{summarise(order)}</Text>
                </View>

                <View className="items-end gap-1">
                  <View className="gd-order-status">
                    <Text className="gd-order-status-text">
                      {t(KIND_LABELS[order.kind])}
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
