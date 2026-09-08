import { useSSO, useSignIn } from "@clerk/clerk-expo";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { clsx } from "clsx";
import * as AuthSession from "expo-auth-session";
import { useRouter, type Href } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { usePostHog } from "posthog-react-native";
import { useCallback, useEffect, useState } from "react";
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
import PasswordField from "@/components/PasswordField";
import VerifyCodeStep from "@/components/VerifyCodeStep";
import { colors } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useKeyboardVisible } from "@/lib/useKeyboardVisible";
import { isEmailLike, readErrorMessage } from "@/lib/auth";

// NativeWind only auto-handles React Native's own components; third-party ones
// need styled() or their className is dropped on native.
const SafeAreaView = styled(RNSafeAreaView);

WebBrowser.maybeCompleteAuthSession();

const HOME_ROUTE = "/(tabs)" as Href;



const SignIn = () => {
  const { signIn, isLoaded, setActive } = useSignIn();
  const { startSSOFlow } = useSSO();
  const { t, isHindi } = useLanguage();
  const keyboardVisible = useKeyboardVisible();
  const posthog = usePostHog();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  /*
   * The second step Device Trust asks for on a device Clerk has not seen.
   *
   * The instance has Device Trust switched on, which means a correct password
   * from a new phone or a fresh browser is accepted and then held at
   * `needs_second_factor` until a code sent to the customer's inbox is entered.
   * Until this existed the screen dead-ended there and said "couldn't finish
   * signing in", which read as a wrong password on an account that was fine.
   */
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [code, setCode] = useState("");

  // Warm the in-app browser so the Google sheet opens instantly.
  // Android-only API — it throws on web and is a no-op on iOS.
  useEffect(() => {
    if (Platform.OS !== "android") return;

    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const emailValid = email.length === 0 || isEmailLike(email);
  const passwordValid = password.length > 0;
  const formValid = isEmailLike(email) && passwordValid;

  const completeSignIn = useCallback(
    async (sessionId: string, method: string) => {
      if (!setActive) return;
      await setActive({ session: sessionId });
      posthog?.capture("user_signed_in", { method });
      router.replace(HOME_ROUTE);
    },
    [posthog, router, setActive],
  );

  const handlePasswordSignIn = async () => {
    if (!isLoaded || !signIn || !formValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const result = await signIn.create({
        strategy: "password",
        identifier: email.trim().toLowerCase(),
        password,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await completeSignIn(result.createdSessionId, "password");
        return;
      }

      if (result.status === "needs_second_factor") {
        await sendCode();
        return;
      }

      // Every other status means Clerk wants something this screen does not
      // collect — a password reset, an identifier it did not get. Rare enough
      // to say so plainly rather than guess at a step.
      setErrorMessage(t("signIn.incomplete"));
    } catch (error) {
      setErrorMessage(readErrorMessage(error, t("signIn.failed")));
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Asks Clerk to email the code, and shows the screen that takes it.
   *
   * The email factor is looked up rather than assumed: Device Trust falls back
   * to whatever second factors the instance allows, and on one configured for
   * SMS this would otherwise ask for a code that never arrives.
   */
  const sendCode = async () => {
    if (!signIn) return;

    const emailFactor = signIn.supportedSecondFactors?.find(
      (factor) => factor.strategy === "email_code",
    );

    if (!emailFactor) {
      setErrorMessage(t("signIn.incomplete"));
      return;
    }

    await signIn.prepareSecondFactor({ strategy: "email_code" });
    setCode("");
    setErrorMessage("");
    setAwaitingCode(true);
  };

  const handleVerifyCode = async () => {
    if (!isLoaded || !signIn || code.length !== 6 || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const result = await signIn.attemptSecondFactor({
        strategy: "email_code",
        code,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await completeSignIn(result.createdSessionId, "password");
        return;
      }

      setErrorMessage(t("signIn.incomplete"));
    } catch (error) {
      setErrorMessage(readErrorMessage(error, t("verify.badCode")));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendCode = async () => {
    if (!signIn || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await sendCode();
    } catch (error) {
      setErrorMessage(readErrorMessage(error, t("signIn.failed")));
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
   * Back to the form, and back to the start of the sign-in.
   *
   * The password is cleared with it. A half-finished attempt is still open on
   * Clerk's side, and leaving the field filled invites the customer to press
   * the same button again rather than start the attempt cleanly.
   */
  const cancelCode = () => {
    setAwaitingCode(false);
    setCode("");
    setPassword("");
    setErrorMessage("");
  };



  const handleGoogleSignIn = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const {
        createdSessionId,
        setActive: setActiveSSO,
        signUp: ssoSignUp,
        authSessionResult,
      } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });

      if (createdSessionId && setActiveSSO) {
        await setActiveSSO({ session: createdSessionId });
        posthog?.capture("user_signed_in", { method: "google" });
        router.replace(HOME_ROUTE);
        return;
      }

      // The user backed out of the Google sheet; not an error worth shouting about.
      if (authSessionResult?.type !== "success") return;

      /*
       * Google returned an account but Clerk gave us no session, which means the
       * sign-up is still missing something it requires — on this instance that
       * is a password, since password is configured as required and Google
       * cannot supply one. Say so instead of returning silently, which just
       * dumps the user back on this screen with no explanation.
       */
      const missing = ssoSignUp?.missingFields ?? [];
      setErrorMessage(
        missing.length > 0
          ? t("signIn.googleNeedsMore", { fields: missing.join(", ") })
          : t("signIn.googleNoSession"),
      );
    } catch (error) {
      setErrorMessage(readErrorMessage(error, t("signIn.googleFailed")));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded || !signIn) return null;

  /*
   * Replaces the whole screen rather than sitting under the form, the same way
   * sign-up does it. Half a sign-in behind a code box is not something to keep
   * looking at, and the two flows should not feel like different apps.
   */
  if (awaitingCode) {
    return (
      <VerifyCodeStep
        title={t("signIn.verifyTitle")}
        subtitle={t("signIn.verifySubtitle", {
          email: email.trim().toLowerCase(),
        })}
        code={code}
        onChangeCode={setCode}
        onVerify={() => void handleVerifyCode()}
        onResend={() => void resendCode()}
        onBack={cancelCode}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        backLabel={t("signIn.verifyBack")}
      />
    );
  }


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
            {t("signIn.title")}
          </Text>
          {!keyboardVisible ? (
            <Text className={clsx("ga-subtitle", isHindi && "deva-body")}>
              {t("signIn.subtitle")}
            </Text>
          ) : null}

          {/* Pinned with the header so switching flows never needs a scroll. */}
          <View className="ga-fixed-header-row">
            <AuthToggle active="sign-in" />
          </View>
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
            {/*
              First on the screen, ahead of the email fields.

              Most customers already have a Google account on the phone, and
              the alternative is inventing a password for a pharmacy app they
              may use twice a month. This used to sit under the form behind an
              "or continue with" rule, where it read as a fallback.
            */}
            <Pressable
              className={clsx(
                "ga-google-btn",
                isSubmitting && "ga-social-btn-disabled",
              )}
              onPress={handleGoogleSignIn}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel={t("signIn.google")}
              accessibilityState={{ disabled: isSubmitting }}
            >
              <MaterialCommunityIcons
                name="google"
                size={20}
                color={colors.google}
              />
              <Text className="ga-google-text">{t("signIn.google")}</Text>
            </Pressable>

            <View className="ga-divider-row">
              <View className="ga-divider-line" />
              <Text className="ga-divider-text">{t("signIn.orWithEmail")}</Text>
              <View className="ga-divider-line" />
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
              <PasswordField
                className={`ga-input ${passwordTouched && !passwordValid ? "ga-input-error" : ""}`}
                value={password}
                placeholder="••••••••"
                placeholderTextColor="#8fa3a1"
                onChangeText={setPassword}
                onBlur={() => setPasswordTouched(true)}
                autoComplete="current-password"
              />
              {passwordTouched && !passwordValid ? (
                <Text className="ga-error">{t("auth.passwordRequired")}</Text>
              ) : null}
            </View>

            <Pressable
              onPress={() => router.push("/(auth)/forgot-password" as Href)}
              disabled={isSubmitting}
            >
              <Text className="ga-forgot">{t("signIn.forgotPassword")}</Text>
            </Pressable>

            {errorMessage ? (
              <Text className="ga-error mb-3">{errorMessage}</Text>
            ) : null}

            <Pressable
              className={`ga-btn ${!formValid || isSubmitting ? "ga-btn-disabled" : ""}`}
              onPress={handlePasswordSignIn}
              disabled={!formValid || isSubmitting}
            >
              <Text className="ga-btn-text">
                {isSubmitting ? t("signIn.submitting") : t("auth.signIn")}
              </Text>
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

export default SignIn;
