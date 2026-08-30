import { useSignIn } from "@clerk/clerk-expo";
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
      setErrorMessage("Enter the email address on your account.");
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
      setErrorMessage(readErrorMessage(error, "Unable to send a reset code"));
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
      }
    } catch (error) {
      setErrorMessage(readErrorMessage(error, "That code didn't work"));
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
      }
    } catch (error) {
      setErrorMessage(readErrorMessage(error, "Unable to set a new password"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded || !signIn) return null;

  const copy = {
    request: {
      title: "Reset password",
      subtitle: "We'll email you a code to set a new one.",
    },
    code: {
      title: "Enter your code",
      subtitle: `We sent a 6-digit code to ${email.trim().toLowerCase()}.`,
    },
    password: {
      title: "Set a new password",
      subtitle: "Choose something you haven't used before.",
    },
  }[step];

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
              <Text className="ga-title">{copy.title}</Text>
              <Text className="ga-subtitle">{copy.subtitle}</Text>
            </View>

            {step === "request" ? (
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
                  autoFocus
                />
                {emailTouched && !emailValid ? (
                  <Text className="ga-error">
                    Please enter a valid email address
                  </Text>
                ) : null}
              </View>
            ) : null}

            {step === "code" ? (
              <View className="ga-field">
                <Text className="ga-label">Verification code</Text>
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
                <Text className="ga-label">New password</Text>
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
                  <Text className="ga-error">
                    Use at least 8 characters, and avoid common passwords
                  </Text>
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
                  {isSubmitting ? "Sending…" : "Send reset code"}
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
                    {isSubmitting ? "Verifying…" : "Continue"}
                  </Text>
                </Pressable>
                <Pressable
                  className="ga-btn-outline"
                  onPress={handleRequestCode}
                  disabled={isSubmitting}
                >
                  <Text className="ga-btn-outline-text">Resend code</Text>
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
                  {isSubmitting ? "Saving…" : "Save and sign in"}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              className="ga-divider-row"
              onPress={() => router.replace(SIGN_IN_ROUTE)}
            >
              <View className="ga-divider-line" />
              <Text className="ga-divider-text">Back to sign in</Text>
              <View className="ga-divider-line" />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ForgotPassword;
