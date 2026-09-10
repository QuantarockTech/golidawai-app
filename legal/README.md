# Legal pages for golidawayi.com

Two pages Google and the Play Store both require, written to describe what the
app actually does rather than to sound reassuring.

## Where they go

Upload the two folders to the root of the `golidawayi.com` website, keeping the
folder names, so they serve at:

| File | Must be reachable at |
| --- | --- |
| `privacy/index.html` | `https://golidawayi.com/privacy` |
| `delete-account/index.html` | `https://golidawayi.com/delete-account` |

Serving them as folders with an `index.html` means the clean URL works on
almost any static host without a rewrite rule. If your host serves
`privacy.html` at `/privacy` instead, either arrangement is fine — what matters
is that those two URLs return the page, not a 404.

## Why the exact URL matters

Both are pasted into forms that are checked:

- **Google Cloud → OAuth consent screen** — the privacy policy URL. Google
  requires it to be on the same domain as the homepage, which is why these live
  on `golidawayi.com` and not on the app's own `expo.app` address.
- **Play Console → Store listing** — privacy policy URL.
- **Play Console → App content → Data deletion** — the delete-account URL.

A Play reviewer opens both links by hand. Note that the web app at
`golidawayi.expo.app` is a single-page app, so *every* path there returns HTTP
200 including ones that do not exist — a link that looks alive to an automated
check can still show a reviewer the wrong page. These pages avoid that by being
real files on a static host.

## Keeping them true

The content is not boilerplate; it names the real data flows, and it will go
stale if those change. In particular:

- Prescription images go to **imgbb** on links that expire after
  `LINK_LIFETIME_DAYS` (currently 30) in `lib/imgbb.ts`. The policy states 30
  days and states plainly that the links are unguessable but not
  password-protected.
- Orders reach the pharmacy over **WhatsApp**, on the number in
  `constants/data.ts`.
- Account data lives in **Supabase** (`addresses`, `orders`, `family_members`,
  `emergency_contacts`) behind **Clerk** sign-in.
- **PostHog** receives `user_signed_in`, `user_signed_up`,
  `user_reset_password` and `app_crashed` — no order contents, no prescriptions.

If any of that changes, change these pages in the same commit. A privacy policy
that disagrees with the Data safety form is itself grounds for a Play Store
rejection.
