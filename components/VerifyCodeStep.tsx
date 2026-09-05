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

import { clsx } from "clsx";

import BrandMark from "@/components/BrandMark";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { useKeyboardVisible } from "@/lib/useKeyboardVisible";

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
  verifyLabel,
  backLabel,
}: VerifyCodeStepProps) => {
  const { t, isHindi } = useLanguage();
  const keyboardVisible = useKeyboardVisible();
  const canVerify = code.length === 6 && !isSubmitting;

  return (
    <View className="flex-1 bg-mist">
      <SafeAreaView className="flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        /* Phones stack from the top; a desktop browser centres the whole card. */
        className="flex-1 md:justify-center"
      >
        {/*
         * Held outside the ScrollView so the brand lockup and title stay put
         * while only the form scrolls.
         */}
        <View className="ga-fixed-header">
          {/* Reclaims ~130px for the fields while the keyboard is up. */}
          {!keyboardVisible ? <BrandMark variant="full" size={92} /> : null}
          <Text className={clsx("ga-title", isHindi && "deva-title")}>
            {title}
          </Text>
          {!keyboardVisible ? (
            <Text className={clsx("ga-subtitle", isHindi && "deva-body")}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/*
         * `shrink`, not `flex-1`: the scroll area takes only the height its
         * content needs, so the fields sit directly under the header and the
         * footer directly under the fields. When the content is taller than
         * the space available it shrinks to fit and scrolls as normal, which
         * keeps the footer pinned to the bottom exactly when that matters.
         */}
        <ScrollView
          /*
           * Inline, not a utility class: react-native-web's own ScrollView
           * class sets flexGrow:1 and outranks one, so the scroll area would
           * keep filling the screen and push the footer away from the fields.
           */
          style={{ flexGrow: 0, flexShrink: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="ga-content">
            <View className="ga-field">
              <Text className="ga-label">{t("verify.label")}</Text>
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
                {isSubmitting ? t("verify.submitting") : (verifyLabel ?? t("verify.submit"))}
              </Text>
            </Pressable>

            <Pressable
              className="ga-btn-outline"
              onPress={onResend}
              disabled={isSubmitting}
            >
              <Text className="ga-btn-outline-text">{t("verify.resend")}</Text>
            </Pressable>

            <Pressable className="ga-divider-row" onPress={onBack}>
              <View className="ga-divider-line" />
              <Text className="ga-divider-text">{backLabel ?? t("verify.startOver")}</Text>
              <View className="ga-divider-line" />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>

      {/*
       * Outside both the ScrollView (or it scrolls away) and the SafeAreaView
       * (or the top inset is applied twice, pushing it down the screen).
       * It positions itself off the live inset instead.
       */}
      <LanguageToggle floating />
    </View>
  );
};

export default VerifyCodeStep;
