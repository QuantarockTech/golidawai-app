import CreateSubscriptionModal from "@/components/CreateSubscriptionModal";
import LanguageToggle from "@/components/LanguageToggle";
import ListHeading from "@/components/ListHeading";
import SubscriptionCard from "@/components/SubscriptionCard";
import UpcomingSubscriptionCard from "@/components/UpcomingSubscriptionCard";
import { HOME_BALANCE, UPCOMING_SUBSCRIPTIONS } from "@/constants/data";
import { icons } from "@/constants/icons";
import images from "@/constants/images";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscriptions } from "@/contexts/SubscriptionContext";
import "@/global.css";
import { formatCurrency } from "@/lib/utils";
import { useUser } from "@clerk/clerk-expo";
import dayjs from "dayjs";
import { styled } from "nativewind";
import { useState } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
const SafeAreaView = styled(RNSafeAreaView);

export default function App() {
  const { user } = useUser();
  const { t } = useLanguage();
  const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<
    string | null
  >(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const { subscriptions, addSubscription } = useSubscriptions();

  // Get user display name: firstName, fullName, or email
  const displayName =
    user?.firstName ||
    user?.fullName ||
    user?.emailAddresses[0]?.emailAddress ||
    "User";

  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      {/*
       * Outside the FlatList on purpose — as part of ListHeaderComponent this
       * row (and the language toggle in it) scrolled away with the list.
       */}
      <View className="home-header">
        <View className="home-user">
          <Image
            source={
              user?.imageUrl ? { uri: user.imageUrl } : images.AVATAR
            }
            className="home-avatar"
          />
          <Text
            className="home-user-name"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {displayName}
          </Text>
        </View>

        <View className="flex-row items-center gap-3">
          <LanguageToggle />
          <Pressable
            accessibilityLabel={t("home.addSubscription")}
            onPress={() => setIsCreateModalVisible(true)}
            hitSlop={8}
            className="home-add-button"
          >
            <Image source={icons.add} className="home-add-icon" />
          </Pressable>
        </View>
      </View>

      <FlatList
        ListHeaderComponent={() => (
          <>
            <View className="home-balance-card">
              <Text className="home-balance-label">{t("home.balance")}</Text>

              <View className="home-balance-row">
                <Text className="home-balance-amount">
                  {formatCurrency(HOME_BALANCE.amount)}
                </Text>
                <Text className="home-balance-date">
                  {dayjs(HOME_BALANCE.nextRenewalDate).format("MM/DD")}
                </Text>
              </View>
            </View>

            <View className="mb-5">
              <ListHeading title={t("home.upcoming")} />

              <FlatList
                data={UPCOMING_SUBSCRIPTIONS}
                renderItem={({ item }) => (
                  <UpcomingSubscriptionCard {...item} />
                )}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                ListEmptyComponent={
<Text className="home-empty-state">{t("home.noUpcoming")}</Text>
                }
              />
            </View>

            <ListHeading title={t("home.allSubscriptions")} />
          </>
        )}
        data={subscriptions}
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
        extraData={expandedSubscriptionId}
        ItemSeparatorComponent={() => <View className="h-4" />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text className="home-empty-state">{t("home.noSubscriptions")}</Text>
        }
        contentContainerClassName="pb-30"
      />
      <CreateSubscriptionModal
        visible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
        onCreate={addSubscription}
      />
    </SafeAreaView>
  );
}
