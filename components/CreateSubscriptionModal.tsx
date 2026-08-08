import { icons } from "@/constants/icons";
import clsx from "clsx";
import dayjs from "dayjs";
import React, { useState } from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

const categories = [
  "Entertainment",
  "AI Tools",
  "Developer Tools",
  "Design",
  "Productivity",
  "Cloud",
  "Music",
  "Other",
] as const;

const categoryColors: Record<(typeof categories)[number], string> = {
  Entertainment: "#f5c542",
  "AI Tools": "#b8d4e3",
  "Developer Tools": "#e8def8",
  Design: "#b8e8d0",
  Productivity: "#f3b7a1",
  Cloud: "#b9d8f5",
  Music: "#d6c2f0",
  Other: "#d9d9d9",
};

type CreateSubscriptionModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreate: (subscription: Subscription) => void;
};

const CreateSubscriptionModal = ({
  visible,
  onClose,
  onCreate,
}: CreateSubscriptionModalProps) => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [frequency, setFrequency] = useState<"Monthly" | "Yearly">("Monthly");
  const [category, setCategory] =
    useState<(typeof categories)[number]>("Other");
  const [errorMessage, setErrorMessage] = useState("");

  const numericPrice = Number.parseFloat(price);
  const isValid =
    name.trim().length > 0 && Number.isFinite(numericPrice) && numericPrice > 0;

  const resetForm = () => {
    setName("");
    setPrice("");
    setFrequency("Monthly");
    setCategory("Other");
    setErrorMessage("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    if (!isValid) {
      setErrorMessage("Enter a name and a price greater than zero.");
      return;
    }

    const startDate = dayjs();
    const subscription: Subscription = {
      id: `${name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      name: name.trim(),
      price: numericPrice,
      currency: "USD",
      frequency,
      billing: frequency,
      category,
      status: "active",
      startDate: startDate.toISOString(),
      renewalDate: startDate
        .add(
          frequency === "Monthly" ? 1 : 1,
          frequency === "Monthly" ? "month" : "year",
        )
        .toISOString(),
      icon: icons.wallet,
      color: categoryColors[category],
    };

    onCreate(subscription);
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        className="modal-overlay"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="modal-container">
          <View className="modal-header">
            <Text className="modal-title">New Subscription</Text>
            <Pressable
              accessibilityLabel="Close new subscription modal"
              className="modal-close"
              onPress={handleClose}
            >
              <Text className="modal-close-text">×</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerClassName="modal-body"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="auth-field">
              <Text className="auth-label">Name</Text>
              <TextInput
                className={clsx(
                  "auth-input",
                  errorMessage && !name.trim() && "auth-input-error",
                )}
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  setErrorMessage("");
                }}
                placeholder="e.g. Netflix"
                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                autoCapitalize="words"
              />
            </View>

            <View className="auth-field">
              <Text className="auth-label">Price</Text>
              <TextInput
                className={clsx(
                  "auth-input",
                  errorMessage &&
                    (!Number.isFinite(numericPrice) || numericPrice <= 0) &&
                    "auth-input-error",
                )}
                value={price}
                onChangeText={(value) => {
                  setPrice(value);
                  setErrorMessage("");
                }}
                placeholder="0.00"
                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                keyboardType="decimal-pad"
                inputMode="decimal"
              />
            </View>

            <View className="auth-field">
              <Text className="auth-label">Frequency</Text>
              <View className="picker-row">
                {(["Monthly", "Yearly"] as const).map((option) => {
                  const active = frequency === option;
                  return (
                    <Pressable
                      key={option}
                      className={clsx(
                        "picker-option",
                        active && "picker-option-active",
                      )}
                      onPress={() => setFrequency(option)}
                    >
                      <Text
                        className={clsx(
                          "picker-option-text",
                          active && "picker-option-text-active",
                        )}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="auth-field">
              <Text className="auth-label">Category</Text>
              <View className="category-scroll">
                {categories.map((option) => {
                  const active = category === option;
                  return (
                    <Pressable
                      key={option}
                      className={clsx(
                        "category-chip",
                        active && "category-chip-active",
                      )}
                      onPress={() => setCategory(option)}
                    >
                      <Text
                        className={clsx(
                          "category-chip-text",
                          active && "category-chip-text-active",
                        )}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {errorMessage && <Text className="auth-error">{errorMessage}</Text>}

            <Pressable
              className={clsx(
                "auth-button",
                !isValid && "auth-button-disabled",
              )}
              onPress={handleSubmit}
              disabled={!isValid}
            >
              <Text className="auth-button-text">Add Subscription</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default CreateSubscriptionModal;
