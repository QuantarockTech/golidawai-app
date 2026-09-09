import { useAuth } from "@clerk/clerk-expo";
import { Redirect, type Href } from "expo-router";

/**
 * Where a Google sign-in comes back to — and, almost always, a screen nobody
 * sees.
 *
 * `startSSOFlow` redirects to `golidawayi://sso-callback`, and in the normal
 * case `WebBrowser` catches that URL itself and hands it straight to Clerk;
 * the router is never involved. This route exists for the case where the
 * browser has already let go of the session — the tab was swiped away, Android
 * killed it, the redirect arrived after the app was backgrounded — and the URL
 * falls through to expo-router instead. Without a route to receive it, that
 * lands the customer on "unmatched route" at the end of a sign-in that
 * actually worked.
 *
 * So: wait for Clerk to say whether a session came of it, then send them on.
 * Nothing is rendered in between, because this resolves in a frame or two and
 * a spinner that fast reads as a flicker.
 */
export default function SSOCallback() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;

  return <Redirect href={(isSignedIn ? "/(tabs)" : "/(auth)/sign-in") as Href} />;
}
