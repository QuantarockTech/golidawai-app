import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { clsx } from "clsx";
import { Pressable, ScrollView, Text } from "react-native";

import { colors } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePeople } from "@/contexts/PeopleContext";
import "@/global.css";
import { pressRow } from "@/lib/press";

type PatientPickerProps = {
  /** The chosen member's id, or null for the customer themselves. */
  value: string | null;
  onChange: (id: string | null) => void;
};

/**
 * Who the medicines are for.
 *
 * Hidden entirely until the customer has added someone, because a chooser with
 * one option is a question with one answer — and every row on this screen sits
 * between somebody and their medicine. Once a family list exists, this is the
 * line the pharmacist most wants: a dose for a sixty-year-old and one for a
 * child are different orders of the same box.
 *
 * "Me" leads and is the default. Ordering for yourself is the common case, and
 * it should cost no taps.
 */
export default function PatientPicker({ value, onChange }: PatientPickerProps) {
  const { t } = useLanguage();
  const { family } = usePeople();

  if (family.length === 0) return null;

  return (
    <>
      <Text className="gd-section-title">{t("cart.forWhom")}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gd-chips"
      >
        <Pressable
          className={clsx("gd-chip", !value && "gd-chip-active")}
          style={pressRow}
          onPress={() => onChange(null)}
          accessibilityRole="button"
          accessibilityState={{ selected: !value }}
        >
          <MaterialCommunityIcons
            name="account"
            size={15}
            color={!value ? colors.brandInk : colors.inkMuted}
          />
          <Text
            className={clsx("gd-chip-text", !value && "gd-chip-text-active")}
          >
            {t("cart.forMe")}
          </Text>
        </Pressable>

        {family.map((member) => {
          const active = value === member.id;

          return (
            <Pressable
              key={member.id}
              className={clsx("gd-chip", active && "gd-chip-active")}
              style={pressRow}
              onPress={() => onChange(active ? null : member.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <MaterialCommunityIcons
                name="account-outline"
                size={15}
                color={active ? colors.brandInk : colors.inkMuted}
              />
              <Text
                className={clsx("gd-chip-text", active && "gd-chip-text-active")}
              >
                {member.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}
