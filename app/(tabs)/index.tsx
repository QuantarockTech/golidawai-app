import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function App() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-bold text-success">
        Welcome to Nativewind!
      </Text>
      <Link
        href="/onboarding"
        className="mt-4 rounded-lg bg-primary text-white px-4 py-2"
      >
        <Text>Go to Onboarding</Text>
      </Link>
      <Link
        href="/(auth)/sign-in"
        className="mt-4 rounded-lg bg-primary text-white px-4 py-2"
      >
        <Text>Go to Sign In</Text>
      </Link>
      <Link
        href="/(auth)/sign-up"
        className="mt-4 rounded-lg bg-primary text-white px-4 py-2"
      >
        <Text>Go to Sign Up</Text>
      </Link>
      <Link
        href="/subscriptions/spotify"
        className="mt-4 rounded-lg bg-primary text-white px-4 py-2"
      >
        <Text>Go to Spotify</Text>
      </Link>
      <Link
        href={{ pathname: "/subscriptions/[id]", params: { id: "claude" } }}
        className="mt-4 rounded-lg bg-primary text-white px-4 py-2"
      >
        <Text>Claude Max Subscription</Text>
      </Link>
    </View>
  );
}
