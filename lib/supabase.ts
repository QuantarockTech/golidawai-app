/*
 * Before anything else in this file, and deliberately.
 *
 * supabase-js parses URLs with the `URL` global, and Hermes ships a cut-down
 * one that throws "URL.hostname is not implemented" the moment it is asked for
 * a host. Browsers have the real thing, which is why the web build worked and
 * the first Android build carrying supabase-js closed itself on launch.
 *
 * Imported here rather than in the app entry so the ordering cannot be broken
 * by someone rearranging imports in a screen: this module creates the client,
 * so the polyfill has to be installed by the time this module is evaluated.
 */
import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";

/**
 * The database, with Clerk holding the keys.
 *
 * Supabase Auth is not used at all. Clerk is registered as a third-party auth
 * provider, so every request carries the Clerk session token and the row level
 * security policies in supabase/schema.sql compare `auth.jwt() ->> 'sub'` to
 * each row's user_id. That is the whole of the protection: the app ships a
 * publishable key, which is public by design, so nothing may be readable
 * without a policy that says whose it is.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Whether the app has somewhere to sync to.
 *
 * False when the keys are missing, and the contexts fall back to storing on the
 * device alone — which is exactly how they worked before this existed. A build
 * without Supabase configured is degraded, not broken.
 */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

/*
 * Set once Clerk has a session, and read on every request.
 *
 * Held in a module variable rather than baked into the client because the token
 * is short-lived and Clerk refreshes it: `getToken()` has to be called fresh
 * each time, not captured once. Creating a new client per render instead would
 * throw away its connection pooling on every keystroke.
 */
let readToken: (() => Promise<string | null>) | null = null;

/** Called by the auth bridge in app/_layout.tsx when Clerk's session changes. */
export const setSupabaseTokenReader = (
  reader: (() => Promise<string | null>) | null,
) => {
  readToken = reader;
};

/**
 * Built once, at module load, and never allowed to take the app down with it.
 *
 * This runs before the first screen paints, so anything thrown here closes the
 * app on launch with no message — which is exactly what a missing `URL`
 * polyfill did on the first Android build. The polyfill above fixes that one,
 * but supabase-js reaches for other globals Hermes has historically lacked
 * (`structuredClone` among them), and a syncing feature is never worth a
 * customer's app refusing to open.
 *
 * A null client is a configured degradation: lib/sync.ts checks for it and the
 * contexts fall back to storing on the device alone.
 */
const createSupabase = () => {
  if (!isSupabaseConfigured) return null;

  try {
    return createClient(SUPABASE_URL as string, SUPABASE_KEY as string, {
      // Clerk owns the session. Without this the client would try to persist
      // one of its own and fight Clerk for the same storage.
      auth: { persistSession: false, autoRefreshToken: false },
      accessToken: async () => (readToken ? readToken() : null),
    });
  } catch {
    return null;
  }
};

export const supabase = createSupabase();

/**
 * True when a request failed because the device is offline or the project is
 * asleep, rather than because the data was wrong.
 *
 * Worth telling apart: the first should leave the local copy alone and try
 * again later, and the second is a bug worth surfacing. Supabase free projects
 * pause after a week of no traffic, which looks exactly like being offline.
 */
export const isNetworkError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /fetch|network|timeout|Failed to fetch/i.test(message);
};
