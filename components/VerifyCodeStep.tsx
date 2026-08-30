import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { styled } from "nativewind";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import BrandMark from "@/components/BrandMark";

// NativeWind only auto-handles React Native's own components; third-party ones
// need styled() or their className is dropped on native.
const SafeAreaView = styled(RNSafeAreaView);

type VerifyCodeStepProps = {
  title: string;
  subtitle: string;
  code: string;
  onChangeCode: (value: string) => void;
  onVerify: () => void;
  onResend: () => void;
  onBack: () => void;
  isSubmitting: boolean;
  errorMessage?: string;
  verifyLabel?: string;
  backLabel?: string;
};

/** Shared 6-digit code screen used by both the sign-in and sign-up flows. */
const VerifyCodeStep = ({
  title,
  subtitle,
  code,
  onChangeCode,
  onVerify,
  onResend,
  onBack,
  isSubmitting,
  errorMessage,
  verifyLabel = "Verify",
  backLabel = "Start over",
}: VerifyCodeStepProps) => {
  const canVerify = code.length === 6 && !isSubmitting;

  return (
    <SafeAreaView className="flex-1 bg-mist">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="ga-content">
            <View className="ga-header">
              <BrandMark variant="full" size={92} />
              <Text className="ga-title">{title}</Text>
              <Text className="ga-subtitle">{subtitle}</Text>
            </View>

            <View className="ga-field">
              <Text className="ga-label">Verification code</Text>
              <TextInput
                className={`ga-input ga-input-code ${errorMessage ? "ga-input-error" : ""}`}
                value={code}
                placeholder="······"
                placeholderTextColor="#8fa3a1"
                onChangeText={(value) =>
                  onChangeCode(value.replace(/\D/g, "").slice(0, 6))
                }
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                autoFocus
              />
              {errorMessage ? (
                <Text className="ga-error">{errorMessage}</Text>
              ) : null}
            </View>

            <Pressable
              className={`ga-btn ${!canVerify ? "ga-btn-disabled" : ""}`}
              onPress={onVerify}
              disabled={!canVerify}
            >
              <Text className="ga-btn-text">
                {isSubmitting ? "Verifying…" : verifyLabel}
              </Text>
            </Pressable>

            <Pressable
              className="ga-btn-outline"
              onPress={onResend}
              disabled={isSubmitting}
            >
              <Text className="ga-btn-outline-text">Resend code</Text>
            </Pressable>

            <Pressable className="ga-divider-row" onPress={onBack}>
              <View className="ga-divider-line" />
              <Text className="ga-divider-text">{backLabel}</Text>
              <View className="ga-divider-line" />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default VerifyCodeStep;
