import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Linking, Pressable, Text, View } from "react-native";

import {
  PREVIEW_HEIGHT,
  type MapPreviewProps,
} from "@/components/MapPreview.types";
import { colors } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/global.css";
import { mapsEmbedUrl, mapsLink } from "@/lib/location";
import { pressRow } from "@/lib/press";

/**
 * Where the order is going, drawn by Google, in the browser.
 *
 * A plain `<iframe>` — no map library, no tiles of our own, no key. See
 * `mapsEmbedUrl` for why this particular URL is the one that frames.
 *
 * Not interactive. The frame is Google's, so panning it would move a map the
 * app cannot read the result of, leaving the customer looking at somewhere
 * that is not where their order is going. Pointer events are off and the whole
 * thing is one button that opens the real Google Maps in a new tab instead,
 * where panning does what it looks like it does.
 */
export default function MapPreview({
  latitude,
  longitude,
  label,
}: MapPreviewProps) {
  const { t } = useLanguage();

  const open = () => void Linking.openURL(mapsLink(latitude, longitude));

  return (
    <Pressable
      onPress={open}
      style={pressRow}
      accessibilityRole="button"
      accessibilityLabel={
        label ? t("address.mapOpenAt", { place: label }) : t("address.mapOpen")
      }
    >
      <View className="gd-mapview">
        <iframe
          src={mapsEmbedUrl(latitude, longitude)}
          title={label ?? t("address.mapTitle")}
          width="100%"
          height={PREVIEW_HEIGHT}
          style={{ border: 0, display: "block", pointerEvents: "none" }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </View>

      <View className="gd-map-open">
        <MaterialCommunityIcons
          name="open-in-new"
          size={14}
          color={colors.brandDark}
        />
        <Text className="gd-map-open-text">{t("address.mapOpen")}</Text>
      </View>
    </Pressable>
  );
}
