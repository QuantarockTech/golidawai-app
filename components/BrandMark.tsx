import { Image } from "expo-image";
import { View } from "react-native";

/** Sampled from the company logo artwork. */
export const BRAND_TEAL = "#00A79D";

const ART = {
  mark: require("../assets/images/golidawai-mark.png"),
  full: require("../assets/images/golidawai-logo.png"),
  markWhite: require("../assets/images/golidawai-mark-white.png"),
} as const;

// Intrinsic sizes of the artwork, used to keep each variant in proportion.
const RATIO = {
  mark: 327 / 237,
  full: 961 / 422,
} as const;

type BrandMarkProps = {
  /** Rendered height in px; width follows the artwork's aspect ratio. */
  size?: number;
  /** "mark" is the capsule + tablet alone; "full" adds the wordmark. */
  variant?: keyof typeof RATIO;
  /** Use "light" on deep-teal or otherwise dark surfaces. */
  tone?: "brand" | "light";
};

/** The GoliDawayi.com logo. */
const BrandMark = ({
  size = 38,
  variant = "mark",
  tone = "brand",
}: BrandMarkProps) => (
  <View style={{ height: size, width: size * RATIO[variant] }}>
    <Image
      source={tone === "light" && variant === "mark" ? ART.markWhite : ART[variant]}
      style={{ flex: 1 }}
      contentFit="contain"
      accessibilityLabel="GoliDawayi.com"
    />
  </View>
);

export default BrandMark;
