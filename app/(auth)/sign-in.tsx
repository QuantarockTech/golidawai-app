import { useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter, type Href } from "expo-router";
import { styled } from "nativewind";
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
import { usePostHog } from "posthog-react-native";

const SafeAreaView = styled(RNSafeAreaView);

const SignIn = () => {
  const { signIn, isLoaded, setActive } = useSignIn();
  const posthog = usePostHog();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Validation states
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Client-side validation
  const emailValid =
    emailAddress.length === 0 ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress);
  const passwordValid = password.length > 0;
  const formValid =
    emailAddress.length > 0 && password.length > 0 && emailValid;

  const handleSubmit = async () => {
    if (!isLoaded || !signIn || !formValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const result = await signIn.create({
        strategy: "password",
        identifier: emailAddress,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        posthog?.capture("user_signed_in", { method: "password" });
        router.replace("/(tabs)" as Href);
      } else if (result.status === "needs_second_factor") {
        await result.prepareSecondFactor({ strategy: "email_code" });
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to sign in",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!isLoaded || !signIn || !code || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const result = await signIn.attemptSecondFactor({
        strategy: "email_code",
        code,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        posthog?.capture("user_signed_in", { method: "email_second_factor" });
        router.replace("/(tabs)" as Href);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to verify code",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded || !signIn) return null;

  // Show verification screen if a second factor is needed
  if (signIn.status === "needs_second_factor") {
    return (
      <SafeAreaView className="auth-safe-area">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="auth-screen"
        >
          <ScrollView
            className="auth-scroll"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="auth-content">
              {/* Branding */}
              <View className="auth-brand-block">
                <View className="auth-logo-wrap">
                  <View className="auth-logo-mark">
                    <Text className="auth-logo-mark-text">R</Text>
                  </View>
                  <View>
                    <Text className="auth-wordmark">Recurrly</Text>
                    <Text className="auth-wordmark-sub">SUBSCRIPTIONS</Text>
                  </View>
                </View>
                <Text className="auth-title">Verify your identity</Text>
                <Text className="auth-subtitle">
                  We sent a verification code to your email
                </Text>
              </View>

              {/* Verification Form */}
              <View className="auth-card">
                <View className="auth-form">
                  <View className="auth-field">
                    <Text className="auth-label">Verification Code</Text>
                    <TextInput
                      className="auth-input"
                      value={code}
                      placeholder="Enter 6-digit code"
                      placeholderTextColor="rgba(0, 0, 0, 0.4)"
                      onChangeText={setCode}
                      keyboardType="number-pad"
                      autoComplete="one-time-code"
                      maxLength={6}
                    />
                    {errorMessage && (
                      <Text className="auth-error">{errorMessage}</Text>
                    )}
                  </View>

                  <Pressable
                    className={`auth-button ${(!code || isSubmitting) && "auth-button-disabled"}`}
                    onPress={handleVerify}
                    disabled={!code || isSubmitting}
                  >
                    <Text className="auth-button-text">
                      {isSubmitting ? "Verifying..." : "Verify"}
                    </Text>
                  </Pressable>

                  <Pressable
                    className="auth-secondary-button"
                    onPress={() =>
                      signIn.prepareSecondFactor({ strategy: "email_code" })
                    }
                    disabled={isSubmitting}
                  >
                    <Text className="auth-secondary-button-text">
                      Resend Code
                    </Text>
                  </Pressable>

                  <Pressable
                    className="auth-secondary-button"
                    onPress={async () => {
                      await signIn.create({});
                      setCode("");
                      setErrorMessage("");
                    }}
                    disabled={isSubmitting}
                  >
                    <Text className="auth-secondary-button-text">
                      Start Over
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Main sign-in form
  return (
    <SafeAreaView className="auth-safe-area">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="auth-screen"
      >
        <ScrollView
          className="auth-scroll"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="auth-content">
            {/* Branding */}
            <View className="auth-brand-block">
              <View className="auth-logo-wrap">
                <View className="auth-logo-mark">
                  <Text className="auth-logo-mark-text">R</Text>
                </View>
                <View>
                  <Text className="auth-wordmark">Recurrly</Text>
                  <Text className="auth-wordmark-sub">SUBSCRIPTIONS</Text>
                </View>
              </View>
              <Text className="auth-title">Welcome back</Text>
              <Text className="auth-subtitle">
                Sign in to continue managing your subscriptions
              </Text>
            </View>

            {/* Sign-In Form */}
            <View className="auth-card">
              <View className="auth-form">
                <View className="auth-field">
                  <Text className="auth-label">Email Address</Text>
                  <TextInput
                    className={`auth-input ${emailTouched && !emailValid && "auth-input-error"}`}
                    autoCapitalize="none"
                    value={emailAddress}
                    placeholder="name@example.com"
                    placeholderTextColor="rgba(0, 0, 0, 0.4)"
                    onChangeText={setEmailAddress}
                    onBlur={() => setEmailTouched(true)}
                    keyboardType="email-address"
                    autoComplete="email"
                  />
                  {emailTouched && !emailValid && (
                    <Text className="auth-error">
                      Please enter a valid email address
                    </Text>
                  )}
                  {errorMessage && (
                    <Text className="auth-error">{errorMessage}</Text>
                  )}
                </View>

                <View className="auth-field">
                  <Text className="auth-label">Password</Text>
                  <TextInput
                    className={`auth-input ${passwordTouched && !passwordValid && "auth-input-error"}`}
                    value={password}
                    placeholder="Enter your password"
                    placeholderTextColor="rgba(0, 0, 0, 0.4)"
                    secureTextEntry
                    onChangeText={setPassword}
                    onBlur={() => setPasswordTouched(true)}
                    autoComplete="password"
                  />
                  {passwordTouched && !passwordValid && (
                    <Text className="auth-error">Password is required</Text>
                  )}
                </View>

                <Pressable
                  className={`auth-button ${(!formValid || isSubmitting) && "auth-button-disabled"}`}
                  onPress={handleSubmit}
                  disabled={!formValid || isSubmitting}
                >
                  <Text className="auth-button-text">
                    {isSubmitting ? "Signing In..." : "Sign In"}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Sign-Up Link */}
            <View className="auth-link-row">
              <Text className="auth-link-copy">
                Don&apos;t have an account?
              </Text>
              <Link href="/(auth)/sign-up" asChild>
                <Pressable>
                  <Text className="auth-link">Create Account</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignIn;
