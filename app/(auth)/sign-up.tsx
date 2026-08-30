import { useAuth, useSignUp } from "@clerk/clerk-expo";
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
import VerifyCodeStep from "@/components/VerifyCodeStep";
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
      setErrorMessage(readErrorMessage(error, "Unable to create account"));
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
      }
    } catch (error) {
      setErrorMessage(readErrorMessage(error, "That code didn't work"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!signUp) return;
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
    } catch (error) {
      setErrorMessage(readErrorMessage(error, "Unable to resend the code"));
    }
  };

  if (!isLoaded || !signUp) return null;

  if (signUp.status === "complete" || isSignedIn) return null;

  if (awaitingCode) {
    return (
      <VerifyCodeStep
        title="Verify your email"
        subtitle={`We sent a 6-digit code to ${email.trim().toLowerCase()}.`}
        backLabel="Use a different email"
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
        verifyLabel="Create Account"
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
              <Text className="ga-title">Create account</Text>
              <Text className="ga-subtitle">Takes less than a minute.</Text>
            </View>

            <AuthToggle active="sign-up" />

            <View className="ga-field">
              <Text className="ga-label">Full name</Text>
              <TextInput
                className={`ga-input ${nameTouched && !nameValid ? "ga-input-error" : ""}`}
                value={fullName}
                placeholder="Aditi Sharma"
                placeholderTextColor="#8fa3a1"
                onChangeText={setFullName}
                onBlur={() => setNameTouched(true)}
                autoCapitalize="words"
                autoComplete="name"
              />
              {nameTouched && !nameValid ? (
                <Text className="ga-error">Please enter your name</Text>
              ) : null}
            </View>

            <View className="ga-field">
              <Text className="ga-label">Mobile number</Text>
              <TextInput
                className={`ga-input ${phoneTouched && !phoneValid ? "ga-input-error" : ""}`}
                value={phone}
                placeholder="98765 43210"
                placeholderTextColor="#8fa3a1"
                onChangeText={setPhone}
                onBlur={() => setPhoneTouched(true)}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
              {phoneTouched && !phoneValid ? (
                <Text className="ga-error">Enter a valid mobile number</Text>
              ) : null}
            </View>

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
                autoComplete="new-password"
              />
              {passwordTouched && !passwordValid ? (
                <Text className="ga-error">
                  Use at least 8 characters, and avoid common passwords
                </Text>
              ) : null}
            </View>

            <Text className="ga-consent">
              By continuing you agree to our Terms &amp; Privacy Policy.
            </Text>

            {errorMessage ? (
              <Text className="ga-error mb-3">{errorMessage}</Text>
            ) : null}

            <Pressable
              className={`ga-btn ${!formValid || isSubmitting ? "ga-btn-disabled" : ""}`}
              onPress={handleSubmit}
              disabled={!formValid || isSubmitting}
            >
              <Text className="ga-btn-text">
                {isSubmitting ? "Creating account…" : "Create Account"}
              </Text>
            </Pressable>

            {/* Required for Clerk's bot protection */}
            <View nativeID="clerk-captcha" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignUp;
