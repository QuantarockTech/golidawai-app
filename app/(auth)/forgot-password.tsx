import { useSignIn } from "@clerk/clerk-expo";
import clsx from "clsx";
import { useRouter, type Href } from "expo-router";
import { styled } from "nativewind";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import BrandMark from "@/components/BrandMark";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { useKeyboardVisible } from "@/lib/useKeyboardVisible";
import { isEmailLike, readErrorMessage } from "@/lib/auth";

// NativeWind only auto-handles React Native's own components; third-party ones
// need styled() or their className is dropped on native.
const SafeAreaView = styled(RNSafeAreaView);

const HOME_ROUTE = "/(tabs)" as Href;
const SIGN_IN_ROUTE = "/(auth)/sign-in" as Href;

/**
 * Clerk's reset flow runs in three server-driven steps: request a code, verify
 * it (which moves the sign-in to `needs_new_password`), then set the password.
 */
type Step = "request" | "code" | "password";

const ForgotPassword = () => {
  const { signIn, isLoaded, setActive } = useSignIn();
  const { t, isHindi } = useLanguage();
  const keyboardVisible = useKeyboardVisible();
  const posthog = usePostHog();
  const router = useRouter();

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const emailValid = email.length === 0 || isEmailLike(email);
  const passwordValid = password.length >= 8;

  /** Step 1 — ask Clerk to email a reset code. */
  const handleRequestCode = async () => {
    if (!isLoaded || !signIn || isSubmitting) return;

    setEmailTouched(true);
    if (!isEmailLike(email)) {
      setErrorMessage(t("reset.needEmail"));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim().toLowerCase(),
      });
      setCode("");
      setStep("code");
    } catch (error) {
      setErrorMessage(readErrorMessage(error, t("reset.sendFailed")));
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Step 2 — verify the code; Clerk then expects a new password. */
  const handleVerifyCode = async () => {
    if (!isLoaded || !signIn || code.length !== 6 || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
      });

      if (result.status === "needs_new_password") {
        setStep("password");
        return;
      }

      if (result.status === "complete" && result.createdSessionId) {
        await setActive?.({ session: result.createdSessionId });
        router.replace(HOME_ROUTE);
        return;
      }

      setErrorMessage(t("reset.codeFailed"));
    } catch (error) {
      setErrorMessage(readErrorMessage(error, t("verify.badCode")));
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Step 3 — set the new password and sign the user straight in. */
  const handleResetPassword = async () => {
    if (!isLoaded || !signIn || !passwordValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const result = await signIn.resetPassword({
        password,
        // Anyone holding the old password loses their session.
        signOutOfOtherSessions: true,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive?.({ session: result.createdSessionId });
        posthog?.capture("user_reset_password");
        router.replace(HOME_ROUTE);
        return;
      }

      setErrorMessage(t("reset.saveFailed"));
    } catch (error) {
      setErrorMessage(readErrorMessage(error, t("reset.setPasswordFailed")));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded || !signIn) return null;

  const copy = {
    request: {
      title: t("reset.requestTitle"),
      subtitle: t("reset.requestSubtitle"),
    },
    code: {
      title: t("verify.title"),
      subtitle: t("verify.sentTo", { email: email.trim().toLowerCase() }),
    },
    password: {
      title: t("reset.passwordTitle"),
      subtitle: t("reset.passwordSubtitle"),
    },
  }[step];

  return (
    <View className="flex-1 bg-mist">
      <SafeAreaView className="flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/*
         * Held outside the ScrollView so the brand lockup and title stay put
         * while only the form scrolls.
         */}
        <View className="ga-fixed-header">
          {/* Reclaims ~130px for the fields while the keyboard is up. */}
          {!keyboardVisible ? <BrandMark variant="full" size={92} /> : null}
          <Text className={clsx("ga-title", isHindi && "deva-title")}>
            {copy.title}
          </Text>
          {!keyboardVisible ? (
            <Text className={clsx("ga-subtitle", isHindi && "deva-body")}>
              {copy.subtitle}
            </Text>
          ) : null}
        </View>

        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="ga-content">
            {step === "request" ? (
              <View className="ga-field">
                <Text className="ga-label">{t("auth.email")}</Text>
                <TextInput
                  className={`ga-input ${emailTouched && !emailValid ? "ga-input-error" : ""}`}
                  value={email}
                  placeholder={t("auth.emailPlaceholder")}
                  placeholderTextColor="#8fa3a1"
                  onChangeText={setEmail}
                  onBlur={() => setEmailTouched(true)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  autoFocus
                />
                {emailTouched && !emailValid ? (
                  <Text className="ga-error">{t("auth.invalidEmail")}</Text>
                ) : null}
              </View>
            ) : null}

            {step === "code" ? (
              <View className="ga-field">
                <Text className="ga-label">{t("verify.label")}</Text>
                <TextInput
                  className="ga-input ga-input-code"
                  value={code}
                  placeholder="······"
                  placeholderTextColor="#8fa3a1"
                  onChangeText={(value) =>
                    setCode(value.replace(/\D/g, "").slice(0, 6))
                  }
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  autoFocus
                />
              </View>
            ) : null}

            {step === "password" ? (
              <View className="ga-field">
                <Text className="ga-label">{t("reset.newPassword")}</Text>
                <TextInput
                  className={`ga-input ${passwordTouched && !passwordValid ? "ga-input-error" : ""}`}
                  value={password}
                  placeholder="••••••••"
                  placeholderTextColor="#8fa3a1"
                  secureTextEntry
                  onChangeText={setPassword}
                  onBlur={() => setPasswordTouched(true)}
                  autoComplete="new-password"
                  autoFocus
                />
                {passwordTouched && !passwordValid ? (
                  <Text className="ga-error">{t("auth.passwordTooShort")}</Text>
                ) : null}
              </View>
            ) : null}

            {errorMessage ? (
              <Text className="ga-error mb-3">{errorMessage}</Text>
            ) : null}

            {step === "request" ? (
              <Pressable
                className={`ga-btn ${!isEmailLike(email) || isSubmitting ? "ga-btn-disabled" : ""}`}
                onPress={handleRequestCode}
                disabled={!isEmailLike(email) || isSubmitting}
              >
                <Text className="ga-btn-text">
                  {isSubmitting ? t("reset.sending") : t("reset.send")}
                </Text>
              </Pressable>
            ) : null}

            {step === "code" ? (
              <>
                <Pressable
                  className={`ga-btn ${code.length !== 6 || isSubmitting ? "ga-btn-disabled" : ""}`}
                  onPress={handleVerifyCode}
                  disabled={code.length !== 6 || isSubmitting}
                >
                  <Text className="ga-btn-text">
                    {isSubmitting ? t("verify.submitting") : t("reset.continue")}
                  </Text>
                </Pressable>
                <Pressable
                  className="ga-btn-outline"
                  onPress={handleRequestCode}
                  disabled={isSubmitting}
                >
                  <Text className="ga-btn-outline-text">{t("verify.resend")}</Text>
                </Pressable>
              </>
            ) : null}

            {step === "password" ? (
              <Pressable
                className={`ga-btn ${!passwordValid || isSubmitting ? "ga-btn-disabled" : ""}`}
                onPress={handleResetPassword}
                disabled={!passwordValid || isSubmitting}
              >
                <Text className="ga-btn-text">
                  {isSubmitting ? t("reset.saving") : t("reset.save")}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              className="ga-divider-row"
              onPress={() => router.replace(SIGN_IN_ROUTE)}
            >
              <View className="ga-divider-line" />
              <Text className="ga-divider-text">{t("reset.backToSignIn")}</Text>
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

export default ForgotPassword;
