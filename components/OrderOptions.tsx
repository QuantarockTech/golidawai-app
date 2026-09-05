import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { clsx } from "clsx";
import { Pressable, Switch, Text, View } from "react-native";

import { colors } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrderPrefs } from "@/contexts/OrderPrefsContext";
import "@/global.css";
import { pressSmall } from "@/lib/press";

const PAYMENTS: { method: PaymentMethod; icon: "cash" | "cellphone" }[] = [
  { method: "cash", icon: "cash" },
  { method: "upi", icon: "cellphone" },
];

/**
 * The three questions the pharmacy would otherwise ring up and ask.
 *
 * Shown on every ordering screen, next to the address, for the same reason the
 * address is: this all leaves inside one WhatsApp message that nobody can
 * amend afterwards, so the last thing the customer sees before sending should
 * be everything the message is about to claim on their behalf.
 */
export default function OrderOptions() {
  const { t } = useLanguage();
  const { prefs, setSubstitution, setPayment, setUrgent } = useOrderPrefs();

  return (
    <>
      <Text className="gd-section-title">{t("prefs.title")}</Text>

      <View className="gd-prefs">
        <View className="gd-pref-row">
          <MaterialCommunityIcons
            name="swap-horizontal"
            size={20}
            color={colors.brandDark}
          />
          <View className="min-w-0 flex-1">
            <Text className="gd-pref-label">{t("prefs.substitute")}</Text>
            <Text className="gd-pref-hint">
              {prefs.allowSubstitution
                ? t("prefs.substituteOn")
                : t("prefs.substituteOff")}
            </Text>
          </View>
          <Switch
            value={prefs.allowSubstitution}
            onValueChange={setSubstitution}
            trackColor={{ false: colors.hairlineSoft, true: colors.brand }}
            accessibilityLabel={t("prefs.substitute")}
          />
        </View>

        <View className="gd-pref-row gd-pref-divider">
          <MaterialCommunityIcons
            name="clock-fast"
            size={20}
            color={prefs.urgent ? colors.emergency : colors.brandDark}
          />
          <View className="min-w-0 flex-1">
            <Text className="gd-pref-label">{t("prefs.urgent")}</Text>
            <Text className="gd-pref-hint">{t("prefs.urgentHint")}</Text>
          </View>
          <Switch
            value={prefs.urgent}
            onValueChange={setUrgent}
            trackColor={{ false: colors.hairlineSoft, true: colors.emergency }}
            accessibilityLabel={t("prefs.urgent")}
          />
        </View>

        <View className="gd-pref-block gd-pref-divider">
          <Text className="gd-pref-label">{t("prefs.payment")}</Text>
          <View className="mt-2 flex-row gap-2">
            {PAYMENTS.map(({ method, icon }) => {
              const active = prefs.payment === method;

              return (
                <Pressable
                  key={method}
                  className={clsx("gd-pay", active && "gd-pay-active")}
                  style={pressSmall}
                  onPress={() => setPayment(method)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <MaterialCommunityIcons
                    name={icon}
                    size={18}
                    color={active ? colors.brandDark : colors.inkFaint}
                  />
                  <Text
                    className={clsx("gd-pay-text", active && "gd-pay-text-active")}
                  >
                    {t(method === "cash" ? "prefs.cash" : "prefs.upi")}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </>
  );
}
