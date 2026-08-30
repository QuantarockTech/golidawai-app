import { useSSO, useSignIn } from "@clerk/clerk-expo";
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
import VerifyCodeStep from "@/components/VerifyCodeStep";
import { isEmailLike, readErrorMessage } from "@/lib/auth";

// NativeWind only auto-handles React Native's own components; third-party ones
// need styled() or their className is dropped on native.
const SafeAreaView = styled(RNSafeAreaView);

WebBrowser.maybeCompleteAuthSession();

const HOME_ROUTE = "/(tabs)" as Href;



const SignIn = () => {
  const { signIn, isLoaded, setActive } = useSignIn();
  const { startSSOFlow } = useSSO();
  const posthog = usePostHog();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

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

      // No second factor is enabled on this Clerk instance (authenticator,
      // backup code and phone are all off), so a complete sign-in is the only
      // success path. If MFA is turned on later, handle it here.
      setErrorMessage("Couldn't finish signing in. Please try again.");
    } catch (error) {
      setErrorMessage(readErrorMessage(error, "Unable to sign in"));
    } finally {
      setIsSubmitting(false);
    }
  };

  /** One-tap fallback: email the user a code instead of asking for a password. */
  const handleSendOtp = async () => {
    if (!isLoaded || !signIn || isSubmitting) return;

    setEmailTouched(true);
    if (!isEmailLike(email)) {
      setErrorMessage("Enter your email address to get a code.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const attempt = await signIn.create({
        identifier: email.trim().toLowerCase(),
      });
      const factor = attempt.supportedFirstFactors?.find(
        (candidate) => candidate.strategy === "email_code",
      );

      if (factor?.strategy !== "email_code") {
        setErrorMessage(
          "Codes aren't available for this account. Sign in with your password instead.",
        );
        return;
      }

      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: factor.emailAddressId,
      });

      setCode("");
      setAwaitingCode(true);
    } catch (error) {
      setErrorMessage(readErrorMessage(error, "Unable to send a code"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!isLoaded || !signIn || code.length !== 6) return;

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await completeSignIn(result.createdSessionId, "otp");
      }
    } catch (error) {
      setErrorMessage(readErrorMessage(error, "That code didn't work"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const { createdSessionId, setActive: setActiveSSO } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });

      if (createdSessionId && setActiveSSO) {
        await setActiveSSO({ session: createdSessionId });
        posthog?.capture("user_signed_in", { method: "google" });
        router.replace(HOME_ROUTE);
        return;
      }
    } catch (error) {
      setErrorMessage(readErrorMessage(error, "Unable to continue with Google"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded || !signIn) return null;

  if (awaitingCode) {
    return (
      <VerifyCodeStep
        title="Enter your code"
        subtitle={`We sent a 6-digit code to ${email.trim().toLowerCase()}.`}
        backLabel="Use a different email"
        code={code}
        onChangeCode={setCode}
        onVerify={handleVerifyCode}
        onResend={handleSendOtp}
        onBack={() => {
          setAwaitingCode(false);
          setCode("");
          setErrorMessage("");
        }}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        verifyLabel="Sign In"
      />
    );
  }

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
              <Text className="ga-title">Welcome back</Text>
              <Text className="ga-subtitle">
                Sign in to reorder and track deliveries.
              </Text>
            </View>

            <AuthToggle active="sign-in" />

            <View className="ga-field">
              <Text className="ga-label">Email address</Text>
              <TextInput
                className={`ga-input ${emailTouched && !emailValid ? "ga-input-error" : ""}`}
                value={email}
                placeholder="aditi@email.com"
                placeholderTextColor="#8fa3a1"
                onChangeText={setEmail}
                onBlur={() => setEmailTouched(true)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
              />
              {emailTouched && !emailValid ? (
                <Text className="ga-error">
                  Please enter a valid email address
                </Text>
              ) : null}
            </View>

            <View className="ga-field">
              <Text className="ga-label">Password</Text>
              <TextInput
                className={`ga-input ${passwordTouched && !passwordValid ? "ga-input-error" : ""}`}
                value={password}
                placeholder="••••••••"
                placeholderTextColor="#8fa3a1"
                secureTextEntry
                onChangeText={setPassword}
                onBlur={() => setPasswordTouched(true)}
                autoComplete="current-password"
              />
              {passwordTouched && !passwordValid ? (
                <Text className="ga-error">Password is required</Text>
              ) : null}
            </View>

            <Pressable
              onPress={() => router.push("/(auth)/forgot-password" as Href)}
              disabled={isSubmitting}
            >
              <Text className="ga-forgot">Forgot password?</Text>
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
                {isSubmitting ? "Signing in…" : "Sign In"}
              </Text>
            </Pressable>

            <View className="ga-divider-row">
              <View className="ga-divider-line" />
              <Text className="ga-divider-text">or continue with</Text>
              <View className="ga-divider-line" />
            </View>

            <View className="ga-social-row">
              <Pressable
                className={`ga-social-btn ${isSubmitting ? "ga-social-btn-disabled" : ""}`}
                onPress={handleSendOtp}
                disabled={isSubmitting}
              >
                <Text className="ga-social-text">OTP</Text>
              </Pressable>
              <Pressable
                className={`ga-social-btn ${isSubmitting ? "ga-social-btn-disabled" : ""}`}
                onPress={handleGoogleSignIn}
                disabled={isSubmitting}
              >
                <Text className="ga-social-text">Google</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignIn;
