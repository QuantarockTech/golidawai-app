import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { clsx } from "clsx";
import { styled } from "nativewind";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import ScreenHeader from "@/components/ScreenHeader";
import { colors } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { describeMember, usePeople } from "@/contexts/PeopleContext";
import "@/global.css";
import { confirm, notify } from "@/lib/dialog";
import { pressRow, pressSmall } from "@/lib/press";

const SafeAreaView = styled(RNSafeAreaView);

const BLANK = { name: "", relation: "", age: "" };

/**
 * The people this customer orders medicines for.
 *
 * A pharmacy order is often not for the person placing it, and the pharmacist
 * checking a prescription needs to know whose it is. Keeping the names here
 * saves retyping them into every order — and saves the pharmacy a phone call
 * asking who the blood-pressure tablets are for.
 */
export default function FamilyScreen() {
  const { t } = useLanguage();
  const { family, addMember, updateMember, removeMember, isLoaded } =
    usePeople();

  /** The id being edited, "new" while adding, or null when the list is at rest. */
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState(BLANK);

  const startAdd = () => {
    setDraft(BLANK);
    setEditing("new");
  };

  const startEdit = (member: FamilyMember) => {
    setDraft({
      name: member.name,
      relation: member.relation ?? "",
      age: member.age ?? "",
    });
    setEditing(member.id);
  };

  const cancel = () => {
    setEditing(null);
    setDraft(BLANK);
  };

  const commit = () => {
    const name = draft.name.trim();

    // The only field worth insisting on. A relation and an age help the
    // pharmacist; a nameless entry helps nobody and cannot be told from the
    // next one in the list.
    if (!name) {
      notify(t("family.title"), t("family.nameNeeded"), t("common.ok"));
      return;
    }

    const member = {
      name,
      ...(draft.relation.trim() ? { relation: draft.relation.trim() } : {}),
      ...(draft.age.trim() ? { age: draft.age.trim() } : {}),
    };

    if (editing === "new") addMember(member);
    else if (editing) updateMember(editing, member);

    cancel();
  };

  const askRemove = (member: FamilyMember) => {
    confirm({
      title: t("family.removeTitle"),
      message: t("family.removeBody", { name: member.name }),
      confirmLabel: t("family.remove"),
      cancelLabel: t("common.cancel"),
      destructive: true,
      onConfirm: () => {
        removeMember(member.id);
        if (editing === member.id) cancel();
      },
    });
  };

  return (
    <View className="gd-screen">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScreenHeader title={t("family.title")} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gd-scroll-content"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="gd-custom-note mt-0">{t("family.intro")}</Text>

          {isLoaded && family.length === 0 && editing === null ? (
            <View className="gd-empty">
              <Text className="gd-empty-text">{t("family.empty")}</Text>
            </View>
          ) : null}

          {family.length > 0 ? (
            <View className="gd-list-card mt-3">
              {family.map((member, index) => (
                <View
                  key={member.id}
                  className={clsx(
                    "gd-list-item",
                    index > 0 && "gd-list-divider",
                  )}
                >
                  <View className="gd-list-icon">
                    <MaterialCommunityIcons
                      name="account-outline"
                      size={18}
                      color={colors.brandDark}
                    />
                  </View>

                  <Text className="gd-list-label" numberOfLines={2}>
                    {describeMember(member)}
                  </Text>

                  <Pressable
                    onPress={() => startEdit(member)}
                    style={pressSmall}
                    accessibilityRole="button"
                    accessibilityLabel={t("family.edit", { name: member.name })}
                    hitSlop={8}
                  >
                    <MaterialCommunityIcons
                      name="pencil-outline"
                      size={18}
                      color={colors.inkMuted}
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => askRemove(member)}
                    style={pressSmall}
                    accessibilityRole="button"
                    accessibilityLabel={t("family.removeOne", {
                      name: member.name,
                    })}
                    hitSlop={8}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={18}
                      color={colors.inkFaint}
                    />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {/*
            One form, opened either by "Add" or by a row's pencil. Editing in
            place would mean a list that changes height as you type, and a
            second form would be the same three fields written twice.
          */}
          {editing !== null ? (
            <>
              <Text className="gd-section-title">
                {editing === "new"
                  ? t("family.addTitle")
                  : t("family.editTitle")}
              </Text>

              <TextInput
                className="gd-input-line"
                value={draft.name}
                onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
                placeholder={t("family.namePlaceholder")}
                placeholderTextColor={colors.inkFaint}
                autoFocus
              />

              <View className="mt-2.5 flex-row gap-2.5">
                <TextInput
                  className="gd-input-line flex-1"
                  value={draft.relation}
                  onChangeText={(relation) =>
                    setDraft((d) => ({ ...d, relation }))
                  }
                  placeholder={t("family.relationPlaceholder")}
                  placeholderTextColor={colors.inkFaint}
                />
                <TextInput
                  className="gd-input-line w-28"
                  value={draft.age}
                  onChangeText={(age) => setDraft((d) => ({ ...d, age }))}
                  placeholder={t("family.agePlaceholder")}
                  placeholderTextColor={colors.inkFaint}
                />
              </View>

              <Pressable
                className="gd-btn mt-4"
                style={pressRow}
                onPress={commit}
                accessibilityRole="button"
              >
                <Text className="gd-btn-text">{t("family.save")}</Text>
              </Pressable>

              <Pressable
                className="gd-btn-ghost"
                style={pressRow}
                onPress={cancel}
                accessibilityRole="button"
              >
                <Text className="gd-btn-ghost-text">{t("common.cancel")}</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              className="gd-btn mt-4"
              style={pressRow}
              onPress={startAdd}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons
                name="plus"
                size={18}
                color={colors.brandInk}
              />
              <Text className="gd-btn-text">{t("family.add")}</Text>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
