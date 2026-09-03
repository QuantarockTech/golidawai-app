import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import clsx from "clsx";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/theme";

type QuickActionTileProps = {
  icon: string;
  label: string;
  tone: QuickAction["tone"];
  onPress: () => void;
};

/** One cell of the "What do you need?" grid — concept board frame 04. */
const QuickActionTile = ({
  icon,
  label,
  tone,
  onPress,
}: QuickActionTileProps) => {
  const isEmergency = tone === "emergency";

  return (
    <Pressable
      className="gd-tile"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        className={clsx(
          "gd-tile-icon",
          isEmergency && "gd-tile-icon-emergency",
        )}
      >
        <MaterialCommunityIcons
          // The icon set is typed to its own glyph union; the names come from
          // QUICK_ACTIONS, which is data, so they are checked at that edge.
          name={icon as never}
          size={20}
          color={isEmergency ? colors.emergency : colors.brandDark}
        />
      </View>
      <Text className="gd-tile-label" numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
};

export default QuickActionTile;
