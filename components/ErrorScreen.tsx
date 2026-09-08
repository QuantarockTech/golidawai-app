import { ScrollView, Text, View } from "react-native";

/**
 * What went wrong, on screen, instead of a blank one.
 *
 * The root fallback used to render `null`. That is defensible for a customer —
 * a stack trace helps nobody buying medicine — but it also meant every failure
 * looked identical from the outside: the app either showed nothing or closed,
 * with no way to tell a missing polyfill from a bad import. Diagnosing the
 * first Android crash cost a build and a wrong guess for exactly that reason.
 *
 * So it says what happened. The text is selectable so it can be copied into a
 * message, which is the only way an error from someone else's phone reaches
 * anyone who can fix it.
 */
export default function ErrorScreen({ error }: { error?: unknown }) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "No message";

  const stack = error instanceof Error ? (error.stack ?? "") : "";

  return (
    <View className="gd-error-screen">
      <ScrollView contentContainerClassName="gd-error-body">
        <Text className="gd-error-title">Something broke</Text>
        <Text className="gd-error-hint">
          Copy this and send it on, then reopen the app.
        </Text>

        <Text className="gd-error-message" selectable>
          {message}
        </Text>

        {stack ? (
          <Text className="gd-error-stack" selectable>
            {stack}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
