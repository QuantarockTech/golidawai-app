import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { clsx } from "clsx";
import { useRouter } from "expo-router";
import { styled } from "nativewind";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import ScreenHeader from "@/components/ScreenHeader";
import { PHARMACY_PHONE } from "@/constants/data";
import { colors } from "@/constants/theme";
import { useCart } from "@/contexts/CartContext";
import { useCatalogue } from "@/contexts/CatalogueContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrderDraft } from "@/contexts/OrderDraftContext";
import "@/global.css";
import type { TranslationKey } from "@/lib/i18n/translations";
import { pressRow, pressSmall } from "@/lib/press";

const SafeAreaView = styled(RNSafeAreaView);

/**
 * Translations for the categories we already had words for.
 *
 * The sheet decides which categories exist, so this is a lookup rather than the
 * list itself: a category found here shows in the customer's language, and one
 * the pharmacy invents shows exactly as they typed it. That way a new category
 * works the moment it is added, without waiting for a translation.
 */
const CATEGORY_KEYS: Record<string, TranslationKey> = {
  fever: "order.cat.fever",
  diabetes: "order.cat.diabetes",
  skin: "order.cat.skin",
  heart: "order.cat.heart",
  stomach: "order.cat.stomach",
  vitamins: "order.cat.vitamins",
};

/**
 * How many rows to draw at once.
 *
 * The catalogue is seven hundred products and this list is a plain mapped
 * ScrollView, so drawing all of them builds seven hundred rows before the
 * screen appears. Nobody scrolls that far to find a medicine anyway — the
 * search box is the way in — so this shows the first slice and says how many
 * more there are.
 */
const VISIBLE_LIMIT = 60;

/** Order Medicines — concept board frame 06. */
export default function OrderMedicines() {
  const { t } = useLanguage();
  const router = useRouter();
  const { quantityOf, add, remove, itemCount } = useCart();
  const { medicines, categories, isLoading, failed, refresh } = useCatalogue();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  /*
   * Medicines the customer typed that the catalogue doesn't stock.
   *
   * Still kept out of the cart's priced lines — a cart line needs a price, and
   * nothing here has been matched to stock — but held in the shared draft so
   * they ride along in the same message as everything else.
   */
  const { typedItems: customItems, setTypedItems: setCustomItems } =
    useOrderDraft();
  /** Index of the typed row being corrected, or -1 when none is. */
  const [editIndex, setEditIndex] = useState(-1);
  const [editText, setEditText] = useState("");

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return medicines.filter((med) => {
      const matchesCategory = !category || med.category === category;
      // Company counts as a match: a customer who knows their tablet is the
      // Cipla one should be able to find it that way.
      const matchesQuery =
        !needle ||
        med.name.toLowerCase().includes(needle) ||
        (med.company ?? "").toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [category, query, medicines]);

  /** What is drawn, and how much was left out — see VISIBLE_LIMIT. */
  const visible = results.slice(0, VISIBLE_LIMIT);
  const hidden = results.length - visible.length;

  const typed = query.trim();
  const alreadyTyped = customItems.some(
    (item) => item.name.toLowerCase() === typed.toLowerCase(),
  );

  const addTyped = () => {
    setCustomItems((current) => [...current, { name: typed, quantity: 1 }]);
    // Clearing the box puts the freshly added name in view above.
    setQuery("");
  };

  /**
   * Nudges a typed row's count, and removes the row at zero.
   *
   * Same stepper the catalogue rows carry, for the same reason: "Dolo 650" and
   * "Dolo 650 × 3" are different orders, and without this the pharmacy has to
   * ring up to find out which one was meant.
   */
  const stepTyped = (index: number, by: number) => {
    setCustomItems((current) =>
      current.flatMap((item, i) => {
        if (i !== index) return [item];
        const quantity = item.quantity + by;
        return quantity > 0 ? [{ ...item, quantity }] : [];
      }),
    );

    // The row below would otherwise inherit an open editor when one is removed.
    if (by < 0) setEditIndex(-1);
  };

  const startEdit = (index: number) => {
    setEditIndex(index);
    setEditText(customItems[index].name);
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
        (item, index) =>
          index !== editIndex && item.name.toLowerCase() === next.toLowerCase(),
      );
      if (!next || clashes) return current;

      return current.map((item, index) =>
        index === editIndex ? { ...item, name: next } : item,
      );
    });

    setEditIndex(-1);
    setEditText("");
  };

  /**
   * Takes the typed list to the cart, which is where orders leave from.
   *
   * The names are already in the shared draft — they went there as they were
   * typed — so this only has to close the editor and move the customer along.
   * It used to send a message of its own, which is exactly how one delivery
   * became three WhatsApp threads.
   */
  const reviewOrder = () => {
    setEditIndex(-1);
    router.push("/cart");
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

          {/*
            Only when the sheet says so. The pharmacy's Category column is what
            fills these, so an empty row of chips would otherwise sit above the
            list doing nothing until that column exists.
          */}
          {categories.length > 0 ? (
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

              {categories.map((key) => {
                const active = category === key;
                const label = CATEGORY_KEYS[key];

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
                      {label ? t(label) : key}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

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
                {customItems.map((item, index) => {
                  const editing = index === editIndex;
                  const name = item.name;

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

                          <View className="gd-stepper">
                            <Pressable
                              className="gd-stepper-btn"
                              style={pressSmall}
                              onPress={() => stepTyped(index, -1)}
                              accessibilityRole="button"
                              accessibilityLabel={
                                item.quantity === 1
                                  ? t("order.customRemove", { name })
                                  : t("order.customLess", { name })
                              }
                              hitSlop={8}
                            >
                              <MaterialCommunityIcons
                                name={
                                  item.quantity === 1
                                    ? "trash-can-outline"
                                    : "minus"
                                }
                                size={16}
                                color={colors.brandDark}
                              />
                            </Pressable>
                            <Text className="gd-stepper-count">
                              {item.quantity}
                            </Text>
                            <Pressable
                              className="gd-stepper-btn"
                              style={pressSmall}
                              onPress={() => stepTyped(index, 1)}
                              accessibilityRole="button"
                              accessibilityLabel={t("order.customMore", {
                                name,
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
                          </View>
                        </>
                      )}
                    </View>
                  );
                })}
              </View>

              <Text className="gd-custom-note">{t("order.customNote")}</Text>

              <Pressable
                className="gd-btn mt-3"
                style={pressRow}
                onPress={reviewOrder}
                accessibilityRole="button"
              >
                <Text className="gd-btn-text">{t("order.customReview")}</Text>
              </Pressable>
            </>
          ) : null}

          <Text className="gd-section-title">
            {query.trim()
              ? t("order.resultsFor", { query: query.trim() })
              : t("order.allMedicines")}
          </Text>

          {/*
            Three states before the list itself. Loading only shows when there
            is nothing cached to show instead; the failure only shows when a
            dead network left the screen with nothing, since a stale catalogue
            beats an error message.
          */}
          {isLoading && medicines.length === 0 ? (
            <View className="gd-empty">
              <ActivityIndicator size="small" color={colors.brandDark} />
              <Text className="gd-empty-text mt-2">{t("order.loading")}</Text>
            </View>
          ) : failed && medicines.length === 0 ? (
            <View className="gd-empty">
              <Text className="gd-empty-text">{t("order.loadFailed")}</Text>
              <Pressable
                className="gd-empty-add"
                style={pressSmall}
                onPress={refresh}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons
                  name="refresh"
                  size={16}
                  color={colors.brandDark}
                />
                <Text className="gd-empty-action">{t("order.retry")}</Text>
              </Pressable>
            </View>
          ) : results.length === 0 ? (
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
              {visible.map((item, index) => {
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
                      <Text className="gd-med-name" numberOfLines={2}>
                        {item.name}
                      </Text>

                      {/*
                        Pack size and maker, in the pharmacy's own words. Either
                        can be blank in the sheet — about half the rows have no
                        pack size — so this joins whatever is there rather than
                        printing a gap or the word "undefined".
                      */}
                      {item.packSize || item.company ? (
                        <Text className="gd-med-sub" numberOfLines={1}>
                          {[item.packSize, item.company]
                            .filter(Boolean)
                            .join(" · ")}
                        </Text>
                      ) : null}

                      {item.discount != null ? (
                        <View className="gd-discount-tag">
                          <Text className="gd-discount-tag-text">
                            {t("order.discount", { percent: item.discount })}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/*
                      No price on this row.

                      The catalogue price is an estimate the app never checked
                      against stock or today's MRP, and the pharmacy quotes the
                      real one in the WhatsApp reply. Showing it while someone
                      is choosing invites them to treat it as the price, which
                      is the one thing it is not.
                    */}

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

          {/* Says what was left out, so a capped list never reads as all of it. */}
          {hidden > 0 ? (
            <Text className="gd-custom-note">
              {t("order.moreResults", { count: hidden })}
            </Text>
          ) : null}

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
          Board frame 06 docks the cart to the bottom. It carries a count and
          no total: a running rupee figure on a screen that prices nothing
          would leave the customer no way to tell where the number came from.
          The cart adds it up, and says there that it is an estimate.
        */}
        {itemCount > 0 ? (
          <Pressable
            className="gd-cart-dock"
            style={pressRow}
            onPress={() => router.push("/cart")}
            accessibilityRole="button"
          >
            <Text className="gd-cart-dock-text">
              {t("home.inCart", { count: itemCount })}
            </Text>
          </Pressable>
        ) : null}
      </SafeAreaView>
    </View>
  );
}
