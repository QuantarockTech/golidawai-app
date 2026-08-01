import { Link } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

const signIn = () => {
  return (
    <View>
      <Text>sign-in</Text>
      <Link href="/(auth)/sign-up">Create Account</Link>
    </View>
  );
};

export default signIn;
