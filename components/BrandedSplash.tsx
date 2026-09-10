import { StatusBar } from "expo-status-bar";
import { View, useWindowDimensions, type LayoutChangeEvent } from "react-native";

import BrandMark from "@/components/BrandMark";

/** Intrinsic proportions of the full logo artwork (wordmark included). */
const LOGO_RATIO = 961 / 422;

/** Share of the screen's width the logo takes, with room to breathe either side. */
const LOGO_WIDTH_FRACTION = 0.66;

type BrandedSplashProps = {
  /** Fired on first layout — the cue to hand over from the native splash. */
  onLayout?: (event: LayoutChangeEvent) => void;
};

/*
 * The launch screen the user actually reads.
 *
 * Android 12 and above masks the native splash icon into a circle, so the
 * wordmark can never survive there — only the capsule fits. This takes over the
 * moment the app can paint and shows the whole logo on the same white the
 * native splash uses, which makes the handover invisible.
 */
const BrandedSplash = ({ onLayout }: BrandedSplashProps) => {
  const { width } = useWindowDimensions();
  const logoWidth = width * LOGO_WIDTH_FRACTION;

  return (
    <View
      onLayout={onLayout}
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffffff",
      }}
    >
      {/* Dark icons: the white ground would swallow the light ones a dark-mode
          phone starts with. React Native restores the previous entry on unmount. */}
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <BrandMark variant="full" size={logoWidth / LOGO_RATIO} />
    </View>
  );
};

export default BrandedSplash;
