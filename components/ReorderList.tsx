import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import clsx from "clsx";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/theme";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { pressSmall } from "@/lib/press";
import { formatRupees } from "@/lib/utils";

type ReorderListProps = {
  items: ReorderItem[];
};

/** "Reorder" list — concept board frame 04. */
const ReorderList = ({ items }: ReorderListProps) => {
  const { t } = useLanguage();
  const { quantityOf, add, remove } = useCart();

  return (
    <View className="gd-med-card">
      {items.map((item, index) => {
        const quantity = quantityOf(item.id);

        return (
          <View
            key={item.id}
            className={clsx("gd-med-row", index > 0 && "gd-med-divider")}
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
            </View>

            <Text className="gd-med-price">{formatRupees(item.price)}</Text>

            {/*
             * Once an item is in the cart the single "+" becomes a stepper, so
             * the row itself shows what was added and can undo it. Without this
             * a tap has no visible result and reads as a dead button.
             */}
            {quantity === 0 ? (
              <Pressable
                className="gd-med-add"
                style={pressSmall}
                onPress={() => add(item)}
                accessibilityRole="button"
                accessibilityLabel={t("home.addToCart", { name: item.name })}
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
                    name={quantity === 1 ? "trash-can-outline" : "minus"}
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
                  accessibilityLabel={t("home.addToCart", { name: item.name })}
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
