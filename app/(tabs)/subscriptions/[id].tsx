import { Link, useLocalSearchParams } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

const subscriptionDetails = () => {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const subscriptionId = Array.isArray(id) ? id[0] : id;

  if (!subscriptionId) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-5">
        <Text className="text-2xl font-bold text-primary">
          Subscription not found
        </Text>
        <Text className="mt-2 text-center text-base text-muted-foreground">
          This detail page needs a valid subscription id.
        </Text>
        <Link href="/(tabs)" className="mt-6 rounded-lg bg-primary px-5 py-3">
          <Text className="text-center font-bold text-background">
            Back to subscriptions
          </Text>
        </Link>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background p-5">
      <Text className="text-2xl font-bold text-primary">
        Subscription Details: {subscriptionId}
      </Text>
      <Link href="/(tabs)" className="mt-6 rounded-lg bg-primary px-5 py-3">
        <Text className="text-center font-bold text-background">
          Back to subscriptions
        </Text>
      </Link>
    </View>
  );
};

export default subscriptionDetails;
