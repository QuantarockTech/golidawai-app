import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { styled } from "nativewind";
import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
const SafeAreaView = styled(RNSafeAreaView);

const insights = () => {
  const { t } = useLanguage();

  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      <View className="mb-6 flex-row items-center justify-between">
        <Text className="list-title">{t("insights.title")}</Text>
        <LanguageToggle />
      </View>
    </SafeAreaView>
  );
};

export default insights;
