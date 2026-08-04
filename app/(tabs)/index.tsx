import { Link } from "expo-router";
import { styled } from "nativewind";
import { Text } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
const SafeAreaView = styled(RNSafeAreaView);

export default function App() {
  return (
    <SafeAreaView className="flex-1 bg-background p-5">
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
    </SafeAreaView>
  );
}
