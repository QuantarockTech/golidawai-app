import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import clsx from "clsx";
import { styled } from "nativewind";
import { useMemo, useState } from "react";
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
import {
  MEDICINE_CATEGORIES,
  MEDICINES,
  PHARMACY_PHONE,
} from "@/constants/data";
import { colors } from "@/constants/theme";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/global.css";
import type { TranslationKey } from "@/lib/i18n/translations";
import { pressRow, pressSmall } from "@/lib/press";
import { formatRupees } from "@/lib/utils";

const SafeAreaView = styled(RNSafeAreaView);

const CATEGORY_KEYS: Record<MedicineCategory, TranslationKey> = {
  fever: "order.cat.fever",
  diabetes: "order.cat.diabetes",
  skin: "order.cat.skin",
  heart: "order.cat.heart",
  stomach: "order.cat.stomach",
  vitamins: "order.cat.vitamins",
};

/** Order Medicines — concept board frame 06. */
export default function OrderMedicines() {
  const { t } = useLanguage();
  const { quantityOf, add, remove, itemCount, total } = useCart();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MedicineCategory | null>(null);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return MEDICINES.filter((med) => {
      const matchesCategory = !category || med.category === category;
      const matchesQuery = !needle || med.name.toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <View className="gd-screen">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScreenHeader title={t("order.title")} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gd-scroll-content"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gd-search">
            <MaterialCommunityIcons
              name="magnify"
              size={18}
              color={colors.inkFaint}
            />
            <TextInput
              className="gd-search-input"
              value={query}
              onChangeText={setQuery}
              placeholder={t("order.searchPlaceholder")}
              placeholderTextColor={colors.inkFaint}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <Pressable
                style={pressSmall}
                onPress={() => setQuery("")}
                accessibilityRole="button"
                accessibilityLabel={t("home.clearSearch")}
                hitSlop={8}
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={18}
                  color={colors.inkFaint}
                />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gd-chips"
          >
            <Pressable
              className={clsx("gd-chip", !category && "gd-chip-active")}
              style={pressSmall}
              onPress={() => setCategory(null)}
              accessibilityRole="button"
            >
              <Text
                className={clsx(
                  "gd-chip-text",
                  !category && "gd-chip-text-active",
                )}
              >
                {t("order.all")}
              </Text>
            </Pressable>

            {MEDICINE_CATEGORIES.map((key) => {
              const active = category === key;
              return (
                <Pressable
                  key={key}
                  className={clsx("gd-chip", active && "gd-chip-active")}
                  style={pressSmall}
                  onPress={() => setCategory(active ? null : key)}
                  accessibilityRole="button"
                >
                  <Text
                    className={clsx(
                      "gd-chip-text",
                      active && "gd-chip-text-active",
                    )}
                  >
                    {t(CATEGORY_KEYS[key])}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text className="gd-section-title">
            {query.trim()
              ? t("order.resultsFor", { query: query.trim() })
              : t("order.allMedicines")}
          </Text>

          {results.length === 0 ? (
            <View className="gd-empty">
              <Text className="gd-empty-text">{t("order.empty")}</Text>
            </View>
          ) : (
            <View className="gd-med-card">
              {results.map((item, index) => {
                const quantity = quantityOf(item.id);

                return (
                  <View
                    key={item.id}
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
                        {item.name}
                      </Text>
                      <Text className="gd-med-sub" numberOfLines={1}>
                        {t("home.strip", { count: item.tabletsPerStrip })}
                      </Text>
                      {/*
                       * Flagged here so it is known before checkout, where it
                       * routes into the same pharmacist review as an uploaded
                       * prescription.
                       */}
                      {item.rxRequired ? (
                        <View className="gd-rx-tag">
                          <Text className="gd-rx-tag-text">
                            {t("order.rxRequired")}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text className="gd-med-price">
                      {formatRupees(item.price)}
                    </Text>

                    {quantity === 0 ? (
                      <Pressable
                        className="gd-med-add"
                        style={pressSmall}
                        onPress={() => add(item)}
                        accessibilityRole="button"
                        accessibilityLabel={t("home.addToCart", {
                          name: item.name,
                        })}
                        hitSlop={8}
                      >
                        <MaterialCommunityIcons
                          name="plus"
                          size={18}
                          color={colors.brandInk}
                        />
                      </Pressable>
                    ) : (
                      <View className="gd-stepper">
                        <Pressable
                          className="gd-stepper-btn"
                          style={pressSmall}
                          onPress={() => remove(item.id)}
                          accessibilityRole="button"
                          accessibilityLabel={t("home.removeFromCart", {
                            name: item.name,
                          })}
                          hitSlop={8}
                        >
                          <MaterialCommunityIcons
                            name={
                              quantity === 1 ? "trash-can-outline" : "minus"
                            }
                            size={16}
                            color={colors.brandDark}
                          />
                        </Pressable>
                        <Text className="gd-stepper-count">{quantity}</Text>
                        <Pressable
                          className="gd-stepper-btn"
                          style={pressSmall}
                          onPress={() => add(item)}
                          accessibilityRole="button"
                          accessibilityLabel={t("home.addToCart", {
                            name: item.name,
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
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Anything the catalogue can't cover falls back to a phone call. */}
          <Pressable
            className="gd-call mt-4"
            style={pressRow}
            onPress={() => void Linking.openURL(`tel:${PHARMACY_PHONE}`)}
            accessibilityRole="button"
            accessibilityLabel={t("order.notFoundTitle")}
          >
            <View className="gd-call-icon">
              <MaterialCommunityIcons
                name="phone"
                size={20}
                color={colors.brandDark}
              />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="gd-call-title">{t("order.notFoundTitle")}</Text>
              <Text className="gd-call-body" numberOfLines={1}>
                {t("order.notFoundBody")}
              </Text>
            </View>
            <View className="gd-call-cta">
              <Text className="gd-call-cta-text">{t("home.callNow")}</Text>
            </View>
          </Pressable>
        </ScrollView>

        {/*
         * Board frame 06 docks the cart to the bottom. There is no checkout
         * screen yet (frame 08), so it reports the running total rather than
         * offering a way through that would dead-end.
         */}
        {itemCount > 0 ? (
          <View className="gd-cart-dock">
            <Text className="gd-cart-dock-text">
              {t("home.inCart", { count: itemCount })} · {formatRupees(total)}
            </Text>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}
