import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * Whether the software keyboard is currently up.
 *
 * The auth screens pin a header and a footer, which on a short phone leaves the
 * scroll area too small to show a whole field once the keyboard opens. They use
 * this to drop the brand lockup while typing and give that space back.
 *
 * iOS gets the `Will` events so the layout moves with the keyboard animation
 * rather than snapping after it; Android only fires the `Did` pair.
 */
export function useKeyboardVisible() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const show = Keyboard.addListener(showEvent, () => setIsVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setIsVisible(false));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return isVisible;
}
