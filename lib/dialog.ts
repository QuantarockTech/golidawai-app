import { Alert, Platform } from "react-native";

/**
 * Cross-platform dialogs.
 *
 * react-native-web ships `Alert` as a class whose `alert()` is an empty
 * function, so every React Native alert is silently a no-op in a browser — the
 * button appears dead. These wrappers use the native dialog on iOS/Android and
 * the browser's own on web, so a confirmation works everywhere.
 */

const joinBody = (title: string, message?: string) =>
  [title, message].filter(Boolean).join("\n\n");

/** A message with a single acknowledge button. */
export const notify = (title: string, message?: string, okLabel = "OK") => {
  if (Platform.OS === "web") {
    window.alert(joinBody(title, message));
    return;
  }
  Alert.alert(title, message, [{ text: okLabel }]);
};

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Renders the confirm action in red on native. */
  destructive?: boolean;
  onConfirm: () => void;
};

/** A two-button confirm. `onConfirm` runs only if the user agrees. */
export const confirm = ({
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
}: ConfirmOptions) => {
  if (Platform.OS === "web") {
    if (window.confirm(joinBody(title, message))) onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: cancelLabel, style: "cancel" },
    {
      text: confirmLabel,
      style: destructive ? "destructive" : "default",
      onPress: onConfirm,
    },
  ]);
};
