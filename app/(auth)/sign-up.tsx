import { useAuth, useSignUp } from "@clerk/clerk-expo";
import clsx from "clsx";
import { useRouter, type Href } from "expo-router";
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
import { styled } from "nativewind";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

import AuthToggle from "@/components/AuthToggle";
import BrandMark from "@/components/BrandMark";
import LanguageToggle from "@/components/LanguageToggle";
import VerifyCodeStep from "@/components/VerifyCodeStep";
import { useLanguage } from "@/contexts/LanguageContext";
import { useKeyboardVisible } from "@/lib/useKeyboardVisible";
import {
  isEmailLike,
  isPhoneLike,
  readErrorMessage,
  splitFullName,
  toE164,
} from "@/lib/auth";

// NativeWind only auto-handles React Native's own components; third-party ones
// need styled() or their className is dropped on native.
const SafeAreaView = styled(RNSafeAreaView);

const HOME_ROUTE = "/(tabs)" as Href;


const SignUp = () => {
  const { signUp, isLoaded, setActive } = useSignUp();
  const { isSignedIn } = useAuth();
  const { t, isHindi } = useLanguage();
  const keyboardVisible = useKeyboardVisible();
  const posthog = usePostHog();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [nameTouched, setNameTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const nameValid = fullName.trim().length >= 2;
  const phoneValid = isPhoneLike(phone);
  const emailValid = isEmailLike(email);
  const passwordValid = password.length >= 8;
  const formValid = nameValid && phoneValid && emailValid && passwordValid;

  const finish = async (sessionId: string) => {
    if (!setActive) return;
    await setActive({ session: sessionId });
    posthog?.capture("user_signed_up", { method: "email_password" });
    router.replace(HOME_ROUTE);
  };

  const handleSubmit = async () => {
    if (!isLoaded || !signUp || !formValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const { firstName, lastName } = splitFullName(fullName);
      const result = await signUp.create({
        firstName,
        ...(lastName ? { lastName } : {}),
        emailAddress: email.trim().toLowerCase(),
        password,
        // The mobile number is what we deliver to, but it is not a login
        // credential — phone identifiers are a paid Clerk feature. Storing it
        // as metadata keeps it on the user record at no cost, and it can be
        // promoted to a real identifier later without changing these screens.
        unsafeMetadata: { phone: toE164(phone) },
      });

      if (result.status === "complete" && result.createdSessionId) {
        await finish(result.createdSessionId);
        return;
      }

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setCode("");
      setAwaitingCode(true);
    } catch (error) {
      setErrorMessage(readErrorMessage(error, t("signUp.failed")));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!isLoaded || !signUp || code.length !== 6) return;

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === "complete" && result.createdSessionId) {
        await finish(result.createdSessionId);
        return;
      }

      // Email is the only verification step on this instance, so anything other
      // than a complete sign-up means a required field is still missing.
      setErrorMessage(t("signUp.incomplete"));
    } catch (error) {
      setErrorMessage(readErrorMessage(error, t("verify.badCode")));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!signUp) return;
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
    } catch (error) {
      setErrorMessage(readErrorMessage(error, t("signUp.resendFailed")));
    }
  };

  if (!isLoaded || !signUp) return null;

  if (signUp.status === "complete" || isSignedIn) return null;

  if (awaitingCode) {
    return (
      <VerifyCodeStep
        title={t("signUp.verifyTitle")}
        subtitle={t("verify.sentTo", { email: email.trim().toLowerCase() })}
        backLabel={t("signUp.useDifferentEmail")}
        code={code}
        onChangeCode={setCode}
        onVerify={handleVerify}
        onResend={handleResend}
        onBack={() => {
          setAwaitingCode(false);
          setCode("");
          setErrorMessage("");
        }}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        verifyLabel={t("signUp.submit")}
      />
    );
  }

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
            {t("signUp.title")}
          </Text>
          {!keyboardVisible ? (
            <Text className={clsx("ga-subtitle", isHindi && "deva-body")}>
              {t("signUp.subtitle")}
            </Text>
          ) : null}

          {/* Pinned with the header so switching flows never needs a scroll. */}
          <View className="ga-fixed-header-row">
            <AuthToggle active="sign-up" />
          </View>
        </View>

        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="ga-content">
            <View className="ga-field">
              <Text className="ga-label">{t("signUp.fullName")}</Text>
              <TextInput
                className={`ga-input ${nameTouched && !nameValid ? "ga-input-error" : ""}`}
                value={fullName}
                placeholder={t("signUp.fullNamePlaceholder")}
                placeholderTextColor="#8fa3a1"
                onChangeText={setFullName}
                onBlur={() => setNameTouched(true)}
                autoCapitalize="words"
                autoComplete="name"
              />
              {nameTouched && !nameValid ? (
                <Text className="ga-error">{t("signUp.nameRequired")}</Text>
              ) : null}
            </View>

            <View className="ga-field">
              <Text className="ga-label">{t("signUp.mobile")}</Text>
              <TextInput
                className={`ga-input ${phoneTouched && !phoneValid ? "ga-input-error" : ""}`}
                value={phone}
                placeholder={t("signUp.mobilePlaceholder")}
                placeholderTextColor="#8fa3a1"
                onChangeText={setPhone}
                onBlur={() => setPhoneTouched(true)}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
              {phoneTouched && !phoneValid ? (
                <Text className="ga-error">{t("signUp.invalidMobile")}</Text>
              ) : null}
            </View>

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
              />
              {emailTouched && !emailValid ? (
                <Text className="ga-error">{t("auth.invalidEmail")}</Text>
              ) : null}
            </View>

            <View className="ga-field">
              <Text className="ga-label">{t("auth.password")}</Text>
              <TextInput
                className={`ga-input ${passwordTouched && !passwordValid ? "ga-input-error" : ""}`}
                value={password}
                placeholder="••••••••"
                placeholderTextColor="#8fa3a1"
                secureTextEntry
                onChangeText={setPassword}
                onBlur={() => setPasswordTouched(true)}
                autoComplete="new-password"
              />
              {passwordTouched && !passwordValid ? (
                <Text className="ga-error">{t("auth.passwordTooShort")}</Text>
              ) : null}
            </View>

          </View>
        </ScrollView>

        {/*
         * Pinned footer: the submit button shouldn't need hunting for. The
         * error travels with it — an error the user has to scroll to find is
         * an error that looks like a dead button.
         */}
        <View className="ga-fixed-footer">
          {errorMessage ? (
            <Text className="ga-error mb-3">{errorMessage}</Text>
          ) : null}

          <Pressable
            className={`ga-btn ${!formValid || isSubmitting ? "ga-btn-disabled" : ""}`}
            onPress={handleSubmit}
            disabled={!formValid || isSubmitting}
          >
            <Text className="ga-btn-text">
              {isSubmitting ? t("signUp.submitting") : t("signUp.submit")}
            </Text>
          </Pressable>

          {/* Required for Clerk's bot protection */}
          <View nativeID="clerk-captcha" />
        </View>
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

export default SignUp;
