import { Link, useLocalSearchParams } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

const subscriptionDetails = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View>
      <Text>Subscription Details: {id}</Text>
      <Link href="/">Back to Home Page</Link>
    </View>
  );
};

export default subscriptionDetails;
