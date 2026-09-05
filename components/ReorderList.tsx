import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { clsx } from "clsx";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/theme";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrderDraft } from "@/contexts/OrderDraftContext";
import { pressSmall } from "@/lib/press";
import type { ReorderEntry } from "@/lib/useReorder";

type ReorderListProps = {
  entries: ReorderEntry[];
};

/**
 * "Reorder" list — concept board frame 04, now filled from the customer's own
 * history rather than a fixed six.
 *
 * A row goes back to wherever it came from. A catalogue medicine returns to the
 * cart; one the customer typed returns to the typed list, because it still has
 * no price and the pharmacist still has to quote it.
 */
const ReorderList = ({ entries }: ReorderListProps) => {
  const { t } = useLanguage();
  const { quantityOf, add, remove } = useCart();
  const { typedItems, setTypedItems } = useOrderDraft();

  const typedQuantity = (name: string) =>
    typedItems.find(
      (item) => item.name.toLowerCase() === name.toLowerCase(),
    )?.quantity ?? 0;

  const stepTyped = (name: string, by: number) => {
    setTypedItems((current) => {
      const index = current.findIndex(
        (item) => item.name.toLowerCase() === name.toLowerCase(),
      );

      if (index === -1) return by > 0 ? [...current, { name, quantity: 1 }] : current;

      return current.flatMap((item, i) => {
        if (i !== index) return [item];
        const quantity = item.quantity + by;
        return quantity > 0 ? [{ ...item, quantity }] : [];
      });
    });
  };

  return (
    <View className="gd-med-card">
      {entries.map((entry, index) => {
        const quantity =
          entry.kind === "catalogue"
            ? quantityOf(entry.id)
            : typedQuantity(entry.name);

        const addOne = () =>
          entry.kind === "catalogue"
            ? add(entry.item)
            : stepTyped(entry.name, 1);

        const removeOne = () =>
          entry.kind === "catalogue"
            ? remove(entry.id)
            : stepTyped(entry.name, -1);

        return (
          <View
            key={entry.id}
            className={clsx("gd-med-row", index > 0 && "gd-med-divider")}
          >
            <View className="gd-med-thumb">
              <MaterialCommunityIcons
                name={entry.kind === "catalogue" ? "pill" : "note-text-outline"}
                size={20}
                color={colors.brandDark}
              />
            </View>

            <View className="min-w-0 flex-1">
              <Text className="gd-med-name" numberOfLines={1}>
                {entry.name}
              </Text>
              <Text className="gd-med-sub" numberOfLines={1}>
                {entry.kind === "catalogue"
                  ? t("home.strip", { count: entry.item.tabletsPerStrip })
                  : t("home.typedItem")}
              </Text>
            </View>

            {/*
             * Once an item is in the cart the single "+" becomes a stepper, so
             * the row itself shows what was added and can undo it. Without this
             * a tap has no visible result and reads as a dead button.
             */}
            {quantity === 0 ? (
              <Pressable
                className="gd-med-add"
                style={pressSmall}
                onPress={addOne}
                accessibilityRole="button"
                accessibilityLabel={t("home.addToCart", { name: entry.name })}
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
                  onPress={removeOne}
                  accessibilityRole="button"
                  accessibilityLabel={t("home.removeFromCart", {
                    name: entry.name,
                  })}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons
                    name={quantity === 1 ? "trash-can-outline" : "minus"}
                    size={16}
                    color={colors.brandDark}
                  />
                </Pressable>

                <Text className="gd-stepper-count">{quantity}</Text>

                <Pressable
                  className="gd-stepper-btn"
                  style={pressSmall}
                  onPress={addOne}
                  accessibilityRole="button"
                  accessibilityLabel={t("home.addToCart", { name: entry.name })}
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
  );
};

export default ReorderList;
