import LanguageToggle from "@/components/LanguageToggle";
import SubscriptionCard from "@/components/SubscriptionCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscriptions } from "@/contexts/SubscriptionContext";
import { styled } from "nativewind";
import React, { useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
const SafeAreaView = styled(RNSafeAreaView);

const Subscriptions = () => {
  const { subscriptions } = useSubscriptions();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<
    string | null
  >(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredSubscriptions = subscriptions.filter((subscription) => {
    if (!normalizedQuery) return true;

    return [
      subscription.name,
      subscription.category,
      subscription.plan,
      subscription.billing,
      subscription.status,
    ]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(normalizedQuery));
  });

  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      {/*
       * Outside the FlatList on purpose — as part of ListHeaderComponent this
       * row (and the language toggle in it) scrolled away with the list.
       */}
      <View className="subscription-header">
        <View className="min-w-0 flex-1">
          <Text className="list-title" numberOfLines={1}>
            {t("subs.title")}
          </Text>
          <Text
            className="mt-1 text-sm font-sans-medium text-muted-foreground"
            numberOfLines={1}
          >
            {t("subs.subtitle")}
          </Text>
        </View>
        <LanguageToggle />
      </View>

      <FlatList
        data={filteredSubscriptions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SubscriptionCard
            {...item}
            expanded={expandedSubscriptionId === item.id}
            onPress={() =>
              setExpandedSubscriptionId((currentId) =>
                currentId === item.id ? null : item.id,
              )
            }
          />
        )}
        ItemSeparatorComponent={() => <View className="h-4" />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="pb-30"
        ListHeaderComponent={
          <View>
            <Text className="subscription-search-label">
              {t("subs.searchLabel")}
            </Text>
            <View className="subscription-search">
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t("subs.searchPlaceholder")}
                placeholderTextColor="rgba(0, 0, 0, 0.45)"
                className="subscription-search-input"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable
                  accessibilityLabel={t("subs.clearSearch")}
                  onPress={() => setSearchQuery("")}
                  className="subscription-search-clear"
                >
                  <Text className="text-lg font-sans-bold text-primary">×</Text>
                </Pressable>
              )}
            </View>

            <Text className="subscription-count">
              {filteredSubscriptions.length === 1
                ? t("subs.countOne", { count: filteredSubscriptions.length })
                : t("subs.countOther", { count: filteredSubscriptions.length })}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="subscription-empty">
            <Text className="text-lg font-sans-bold text-primary">
              {t("subs.emptyTitle")}
            </Text>
            <Text className="mt-1 text-center text-sm font-sans-medium text-muted-foreground">
              {t("subs.emptyBody")}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default Subscriptions;
