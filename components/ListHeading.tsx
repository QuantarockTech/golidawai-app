import { Text, TouchableOpacity, View } from "react-native";

import { useLanguage } from "@/contexts/LanguageContext";

const ListHeading = ({ title }: ListHeadingProps) => {
  const { t } = useLanguage();

  return (
    <View className="list-head">
      <Text className="list-title">{title}</Text>

      <TouchableOpacity className="list-action">
        <Text className="list-action-text">{t("home.viewAll")}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ListHeading;
