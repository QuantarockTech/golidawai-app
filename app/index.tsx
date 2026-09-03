import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();

  // Wait for auth to load before rendering anything
  if (!isLoaded) {
    return null;
  }

  // The splash is for new arrivals only — a returning signed-in user goes
  // straight to their subscriptions rather than back through the welcome.
  return <Redirect href={isSignedIn ? "/(tabs)" : "/onboarding"} />;
}
