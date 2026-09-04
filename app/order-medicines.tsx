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
  PHARMACY,
  PHARMACY_PHONE,
  WHATSAPP_NUMBER,
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
  /*
   * Medicines the customer typed that the catalogue doesn't stock. Kept out of
   * the cart on purpose: a cart line needs a price, and nothing here has been
   * matched to stock, so these travel to the pharmacist over WhatsApp instead
   * of through a checkout that would have to invent a total.
   */
  const [customItems, setCustomItems] = useState<string[]>([]);
  /** Index of the typed row being corrected, or -1 when none is. */
  const [editIndex, setEditIndex] = useState(-1);
  const [editText, setEditText] = useState("");

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return MEDICINES.filter((med) => {
      const matchesCategory = !category || med.category === category;
      const matchesQuery = !needle || med.name.toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const typed = query.trim();
  const alreadyTyped = customItems.some(
    (name) => name.toLowerCase() === typed.toLowerCase(),
  );

  const addTyped = () => {
    setCustomItems((current) => [...current, typed]);
    // Clearing the box puts the freshly added name in view above.
    setQuery("");
  };

  const startEdit = (index: number) => {
    setEditIndex(index);
    setEditText(customItems[index]);
  };

  /**
   * Commits the correction. An empty box or a name already on the list would
   * both leave the row in a worse state than before, so either just closes the
   * editor and keeps what was there.
   */
  const commitEdit = () => {
    const next = editText.trim();

    setCustomItems((current) => {
      const clashes = current.some(
        (name, index) =>
          index !== editIndex && name.toLowerCase() === next.toLowerCase(),
      );
      if (!next || clashes) return current;

      return current.map((name, index) => (index === editIndex ? next : name));
    });

    setEditIndex(-1);
    setEditText("");
  };

  const removeTyped = (index: number) => {
    setCustomItems((current) => current.filter((_, i) => i !== index));
    // The row under it would otherwise inherit the open editor.
    setEditIndex(-1);
  };

  /**
   * WhatsApp is the one route that reaches the pharmacist today, so the typed
   * list goes out as plain text they can read and price by hand.
   */
  const sendCustomList = () => {
    const lines = [
      t("order.customTitle"),
      ...customItems.map((name, index) => `${index + 1}. ${name}`),
      "",
      `${t("rx.deliverTo")}: ${PHARMACY.addressLines.join(", ")}`,
    ];

    void Linking.openURL(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`,
    );
  };

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

          {/*
           * Sits above the catalogue: these are the medicines the customer
           * actually came for, so they shouldn't be buried under a list of
           * everything else.
           */}
          {customItems.length > 0 ? (
            <>
              <Text className="gd-section-title">
                {t("order.customTitle")}
              </Text>

              <View className="gd-med-card">
                {customItems.map((name, index) => {
                  const editing = index === editIndex;

                  return (
                    <View
                      key={name}
                      className={clsx(
                        "gd-med-row",
                        index > 0 && "gd-med-divider",
                      )}
                    >
                      {editing ? (
                        <>
                          <TextInput
                            className="gd-custom-input"
                            value={editText}
                            onChangeText={setEditText}
                            placeholderTextColor={colors.inkFaint}
                            autoFocus
                            autoCapitalize="words"
                            autoCorrect={false}
                            returnKeyType="done"
                            onSubmitEditing={commitEdit}
                          />

                          <Pressable
                            className="gd-custom-action gd-custom-action-save"
                            style={pressSmall}
                            onPress={commitEdit}
                            accessibilityRole="button"
                            accessibilityLabel={t("order.customSave")}
                            hitSlop={8}
                          >
                            <MaterialCommunityIcons
                              name="check"
                              size={16}
                              color={colors.brandInk}
                            />
                          </Pressable>
                        </>
                      ) : (
                        <>
                          <View className="gd-med-thumb">
                            <MaterialCommunityIcons
                              name="note-text-outline"
                              size={20}
                              color={colors.brandDark}
                            />
                          </View>

                          <View className="min-w-0 flex-1">
                            <Text className="gd-med-name" numberOfLines={2}>
                              {name}
                            </Text>
                          </View>

                          <View className="gd-custom-actions">
                            <Pressable
                              className="gd-custom-action"
                              style={pressSmall}
                              onPress={() => startEdit(index)}
                              accessibilityRole="button"
                              accessibilityLabel={t("order.customEdit", {
                                name,
                              })}
                              hitSlop={8}
                            >
                              <MaterialCommunityIcons
                                name="pencil-outline"
                                size={16}
                                color={colors.brandDark}
                              />
                            </Pressable>

                            <Pressable
                              className="gd-custom-action"
                              style={pressSmall}
                              onPress={() => removeTyped(index)}
                              accessibilityRole="button"
                              accessibilityLabel={t("order.customRemove", {
                                name,
                              })}
                              hitSlop={8}
                            >
                              <MaterialCommunityIcons
                                name="trash-can-outline"
                                size={16}
                                color={colors.brandDark}
                              />
                            </Pressable>
                          </View>
                        </>
                      )}
                    </View>
                  );
                })}
              </View>

              <Text className="gd-custom-note">{t("order.customNote")}</Text>

              <Pressable
                className="gd-btn-whatsapp mt-3"
                style={pressRow}
                onPress={sendCustomList}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons
                  name="whatsapp"
                  size={20}
                  color="#ffffff"
                />
                <Text className="gd-btn-whatsapp-text">
                  {t("order.customSend")}
                </Text>
              </Pressable>
            </>
          ) : null}

          <Text className="gd-section-title">
            {query.trim()
              ? t("order.resultsFor", { query: query.trim() })
              : t("order.allMedicines")}
          </Text>

          {results.length === 0 ? (
            <View className="gd-empty">
              <Text className="gd-empty-text">{t("order.empty")}</Text>

              {/*
               * The catalogue is small, so "no results" is the common case for
               * a real prescription. Rather than dead-end, it takes the name
               * exactly as typed.
               */}
              {typed && !alreadyTyped ? (
                <Pressable
                  className="gd-empty-add"
                  style={pressSmall}
                  onPress={addTyped}
                  accessibilityRole="button"
                  accessibilityLabel={t("order.addTyped", { name: typed })}
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={16}
                    color={colors.brandDark}
                  />
                  <Text className="gd-empty-action" numberOfLines={1}>
                    {t("order.addTyped", { name: typed })}
                  </Text>
                </Pressable>
              ) : null}
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
