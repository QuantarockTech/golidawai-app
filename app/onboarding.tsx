import { Link } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

const onboarding = () => {
  return (
    <View className="flex-1 bg-background px-5 pt-12">
      <Text className="text-4xl font-bold text-primary">Welcome</Text>
      <Text className="mt-2 text-2xl font-semibold text-primary">
        Manage your subscriptions smarter
      </Text>

      <View className="mt-10 gap-4">
        <Link
          href="/(auth)/sign-in"
          className="rounded-xl bg-primary px-5 py-4"
        >
          <Text className="text-center text-base font-bold text-background">
            Sign In
          </Text>
        </Link>

        <Link
          href="/(auth)/sign-up"
          className="rounded-xl border border-primary/20 bg-white px-5 py-4"
        >
          <Text className="text-center text-base font-bold text-primary">
            Create Account
          </Text>
        </Link>

        <Link href="/(tabs)" className="mt-2">
          <Text className="text-center text-sm font-medium text-primary/70">
            Continue to app
          </Text>
        </Link>
      </View>
    </View>
  );
};

export default onboarding;
