import { Link, useLocalSearchParams } from "expo-router";

import { useLanguage } from "@/contexts/LanguageContext";
import React from "react";
import { Text, View } from "react-native";

const SubscriptionDetails = () => {
  const { t } = useLanguage();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const subscriptionId = Array.isArray(id) ? id[0] : id;

  if (!subscriptionId) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-5">
        <Text className="text-2xl font-bold text-primary">
          {t("subs.notFound")}
        </Text>
        <Text className="mt-2 text-center text-base text-muted-foreground">
          {t("subs.notFoundBody")}
        </Text>
        <Link href="/(tabs)" className="mt-6 rounded-lg bg-primary px-5 py-3">
          <Text className="text-center font-bold text-background">
            {t("subs.back")}
          </Text>
        </Link>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background p-5">
      <Text className="text-2xl font-bold text-primary">
        {t("subs.details")}: {subscriptionId}
      </Text>
      <Link href="/(tabs)" className="mt-6 rounded-lg bg-primary px-5 py-3">
        <Text className="text-center font-bold text-background">
          {t("subs.back")}
        </Text>
      </Link>
    </View>
  );
};

export default SubscriptionDetails;
