import SubscriptionCard from "@/components/SubscriptionCard";
import { useSubscriptions } from "@/contexts/SubscriptionContext";
import { styled } from "nativewind";
import React, { useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
const SafeAreaView = styled(RNSafeAreaView);

const Subscriptions = () => {
  const { subscriptions } = useSubscriptions();
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
            <View className="subscription-header">
              <View className="min-w-0 flex-1">
                <Text className="list-title" numberOfLines={1}>
                  Subscriptions
                </Text>
                <Text
                  className="mt-1 text-sm font-sans-medium text-muted-foreground"
                  numberOfLines={1}
                >
                  Keep track of every recurring payment
                </Text>
              </View>
              {/* <Image source={icons.add} className="subscription-add-icon" /> */}
            </View>

            <Text className="subscription-search-label">
              Find a subscription
            </Text>
            <View className="subscription-search">
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by name or category"
                placeholderTextColor="rgba(0, 0, 0, 0.45)"
                className="subscription-search-input"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable
                  accessibilityLabel="Clear subscription search"
                  onPress={() => setSearchQuery("")}
                  className="subscription-search-clear"
                >
                  <Text className="text-lg font-sans-bold text-primary">×</Text>
                </Pressable>
              )}
            </View>

            <Text className="subscription-count">
              {filteredSubscriptions.length}{" "}
              {filteredSubscriptions.length === 1
                ? "subscription"
                : "subscriptions"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="subscription-empty">
            <Text className="text-lg font-sans-bold text-primary">
              No subscriptions found
            </Text>
            <Text className="mt-1 text-center text-sm font-sans-medium text-muted-foreground">
              Try a different name, category, or status.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default Subscriptions;
