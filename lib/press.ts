import type {
  PressableStateCallbackType,
  StyleProp,
  ViewStyle,
} from "react-native";

/**
 * One touch response for the whole app.
 *
 * Everything tappable dims on press; small targets (tiles, icon buttons) also
 * settle slightly, which reads as a press on a control too small for the dim
 * alone to be obvious. Full-width rows only dim — scaling a row the width of
 * the screen looks like the layout is shifting rather than responding.
 */
export const pressFeedback =
  (options: { scale?: boolean } = {}) =>
  ({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> =>
    pressed
      ? {
          opacity: 0.62,
          ...(options.scale ? { transform: [{ scale: 0.97 }] } : {}),
        }
      : null;

/** Tiles, icon buttons and other small targets. */
export const pressSmall = pressFeedback({ scale: true });

/** Full-width rows, banners and list items. */
export const pressRow = pressFeedback();
