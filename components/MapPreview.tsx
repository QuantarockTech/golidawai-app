import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Linking, Pressable, Text, View } from "react-native";

import {
  PREVIEW_HEIGHT,
  type MapPreviewProps,
} from "@/components/MapPreview.types";
import { colors } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/global.css";
import { mapsEmbedHtml, mapsLink } from "@/lib/location";
import { pressRow } from "@/lib/press";

/*
 * Loaded lazily for the same reason expo-location is in lib/location.ts: it is
 * a native module, so it only exists in a build made after the package was
 * added. A static import would take the whole address screen down in an older
 * development build, including the typed address field that needs nothing
 * native. Without it the map is simply absent and the rest still works.
 */
type WebViewModule = typeof import("react-native-webview");

const loadWebView = (): WebViewModule["WebView"] | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require("react-native-webview") as WebViewModule).WebView;
  } catch {
    return null;
  }
};

/**
 * Where the order is going, drawn by Google, on a phone.
 *
 * The same keyless embed the web build frames, in a WebView. See `mapsEmbedUrl`
 * for why this URL needs no API key, and `MapPreview.web.tsx` for the browser
 * half of the pair.
 *
 * Scrolling is off, and deliberately. The map sits inside a ScrollView, so a
 * pannable one would swallow the drag that was meant to scroll the page — and
 * panning would move a map whose result the app cannot read back anyway. The
 * whole card is one button that opens Google Maps proper instead, which is the
 * same thing the rider does with the link in the WhatsApp message.
 */
export default function MapPreview({
  latitude,
  longitude,
  label,
}: MapPreviewProps) {
  const { t } = useLanguage();
  const WebView = loadWebView();

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
      {WebView ? (
        <View className="gd-mapview" pointerEvents="none">
          <WebView
            /*
             * A page holding an iframe, not the embed URL itself. Google
             * refuses to render the embed as a top-level document and answers
             * with "the Google Maps Embed API must be used in an iframe",
             * which is what a WebView pointed at the URL displayed instead of
             * a map. `baseUrl` gives the page an https origin, without which
             * the frame loads from about:blank and Google rejects it again.
             */
            source={{
              html: mapsEmbedHtml(latitude, longitude),
              baseUrl: "https://www.google.com",
            }}
            style={{ height: PREVIEW_HEIGHT, backgroundColor: colors.mist }}
            scrollEnabled={false}
            nestedScrollEnabled={false}
            javaScriptEnabled
            domStorageEnabled
            setSupportMultipleWindows={false}
            originWhitelist={["https://*"]}
          />
        </View>
      ) : null}

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
