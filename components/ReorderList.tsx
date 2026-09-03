import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import clsx from "clsx";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatRupees } from "@/lib/utils";

type ReorderListProps = {
  items: ReorderItem[];
  onAdd: (item: ReorderItem) => void;
};

/** "Reorder" list — concept board frame 04. */
const ReorderList = ({ items, onAdd }: ReorderListProps) => {
  const { t } = useLanguage();

  return (
    <View className="gd-med-card">
      {items.map((item, index) => (
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

          <Pressable
            className="gd-med-add"
            onPress={() => onAdd(item)}
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
        </View>
      ))}
    </View>
  );
};

export default ReorderList;
