import { Platform, useWindowDimensions } from "react-native";

/** Matches the `md:` breakpoint the stylesheet uses for the website layout. */
export const DESKTOP_MIN_WIDTH = 768;

/**
 * True when the app should present as a website rather than a phone app.
 *
 * Deliberately gated on web as well as width: an Android tablet is still the
 * app, and should keep the bottom tab bar and thumb-reachable layout. Only a
 * browser gets the top navigation.
 */
export const useIsDesktop = (): boolean => {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width >= DESKTOP_MIN_WIDTH;
};
