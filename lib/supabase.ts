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

export const supabase =
  isSupabaseConfigured
    ? createClient(SUPABASE_URL as string, SUPABASE_KEY as string, {
        // Clerk owns the session. Without this the client would try to persist
        // one of its own and fight Clerk for the same storage.
        auth: { persistSession: false, autoRefreshToken: false },
        accessToken: async () => (readToken ? readToken() : null),
      })
    : null;

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
