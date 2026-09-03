/**
 * English and Hindi copy for the whole app.
 *
 * Hindi is written in Devanagari, not romanised: the point of the toggle is to
 * reach people who don't read Latin script, and Hinglish only helps those who
 * already do.
 *
 * `en` is the source of truth for the key set — `hi` is typed against it, so a
 * missing or misspelt Hindi key is a compile error rather than a blank label.
 */

export const LANGUAGES = ["en", "hi"] as const;

export type Language = (typeof LANGUAGES)[number];

/** Shown inside the EN/हिं switch itself, so each sits in its own script. */
export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "EN",
  hi: "हिं",
};

const en = {
  // Splash
  "splash.taglinePrimary": "Sehat ki ghar pohuch seva",
  "splash.taglineSecondary": "Your trusted medicine & care partner",
  "splash.getStarted": "Get Started",

  // Shared auth chrome
  "auth.signIn": "Sign In",
  "auth.signUp": "Sign Up",
  "auth.email": "Email address",
  "auth.emailPlaceholder": "aditi@email.com",
  "auth.password": "Password",
  "auth.invalidEmail": "Please enter a valid email address",
  "auth.passwordRequired": "Password is required",
  "auth.passwordTooShort":
    "Use at least 8 characters, and avoid common passwords",

  // Sign in
  "signIn.title": "Welcome back",
  "signIn.subtitle": "Sign in to reorder and track deliveries.",
  "signIn.forgotPassword": "Forgot password?",
  "signIn.submitting": "Signing in…",
  "signIn.orContinueWith": "or continue with",
  "signIn.google": "Google",
  "signIn.failed": "Unable to sign in",
  "signIn.incomplete": "Couldn't finish signing in. Please try again.",
  "signIn.googleFailed": "Unable to continue with Google",

  // Sign up
  "signUp.title": "Create account",
  "signUp.subtitle": "Takes less than a minute.",
  "signUp.fullName": "Full name",
  "signUp.fullNamePlaceholder": "Aditi Sharma",
  "signUp.nameRequired": "Please enter your name",
  "signUp.mobile": "Mobile number",
  "signUp.mobilePlaceholder": "98765 43210",
  "signUp.invalidMobile": "Enter a valid mobile number",
  "signUp.submit": "Create Account",
  "signUp.submitting": "Creating account…",
  "signUp.failed": "Unable to create account",
  "signUp.incomplete":
    "Couldn't finish creating your account. Please try again.",
  "signUp.verifyTitle": "Verify your email",
  "signUp.useDifferentEmail": "Use a different email",
  "signUp.resendFailed": "Unable to resend the code",

  // Code entry
  "verify.title": "Enter your code",
  "verify.sentTo": "We sent a 6-digit code to {email}.",
  "verify.label": "Verification code",
  "verify.submit": "Verify",
  "verify.submitting": "Verifying…",
  "verify.resend": "Resend code",
  "verify.startOver": "Start over",
  "verify.badCode": "That code didn't work",

  // Forgot password
  "reset.needEmail": "Enter the email address on your account.",
  "reset.sendFailed": "Unable to send a reset code",
  "reset.requestTitle": "Reset password",
  "reset.requestSubtitle": "We'll email you a code to set a new one.",
  "reset.passwordTitle": "Set a new password",
  "reset.passwordSubtitle": "Choose something you haven't used before.",
  "reset.newPassword": "New password",
  "reset.send": "Send reset code",
  "reset.sending": "Sending…",
  "reset.continue": "Continue",
  "reset.save": "Save and sign in",
  "reset.saving": "Saving…",
  "reset.backToSignIn": "Back to sign in",
  "reset.codeFailed": "Couldn't verify that code. Please try again.",
  "reset.saveFailed": "Couldn't set your new password. Please try again.",
  "reset.setPasswordFailed": "Unable to set a new password",

  // Tabs
  "tabs.home": "Home",
  "tabs.subscriptions": "Subscriptions",
  "tabs.insights": "Insights",
  "tabs.settings": "Settings",

  // Home
  "home.balance": "Balance",
  "home.upcoming": "Upcoming",
  "home.allSubscriptions": "All Subscriptions",
  "home.noUpcoming": "No upcoming renewals yet.",
  "home.noSubscriptions": "No subscriptions yet.",
  "home.addSubscription": "Add subscription",
  "home.viewAll": "View all",

  // Subscriptions
  "subs.title": "Subscriptions",
  "subs.subtitle": "Keep track of every recurring payment",
  "subs.searchLabel": "Find a subscription",
  "subs.searchPlaceholder": "Search by name or category",
  "subs.clearSearch": "Clear subscription search",
  "subs.countOne": "{count} subscription",
  "subs.countOther": "{count} subscriptions",
  "subs.emptyTitle": "No subscriptions found",
  "subs.emptyBody": "Try a different name, category, or status.",
  "subs.notFound": "Subscription not found",
  "subs.notFoundBody": "This detail page needs a valid subscription id.",
  "subs.back": "Back to subscriptions",
  "subs.details": "Subscription Details",

  // Insights
  "insights.title": "Insights",

  // Settings
  "settings.title": "Settings",
  "settings.account": "Account",
  "settings.accountId": "Account ID",
  "settings.joined": "Joined",
  "settings.signOut": "Sign Out",
  "settings.language": "App language",
  "settings.notAvailable": "N/A",
} as const;

export type TranslationKey = keyof typeof en;

const hi: Record<TranslationKey, string> = {
  // Splash
  "splash.taglinePrimary": "सेहत की घर पहुँच सेवा",
  "splash.taglineSecondary": "आपका भरोसेमंद दवा और देखभाल साथी",
  "splash.getStarted": "शुरू करें",

  // Shared auth chrome
  "auth.signIn": "साइन इन",
  "auth.signUp": "साइन अप",
  "auth.email": "ईमेल पता",
  "auth.emailPlaceholder": "aditi@email.com",
  "auth.password": "पासवर्ड",
  "auth.invalidEmail": "कृपया एक वैध ईमेल पता दर्ज करें",
  "auth.passwordRequired": "पासवर्ड आवश्यक है",
  "auth.passwordTooShort":
    "कम से कम 8 अक्षर इस्तेमाल करें, और आसान पासवर्ड से बचें",

  // Sign in
  "signIn.title": "वापस आने पर स्वागत है",
  "signIn.subtitle": "दोबारा ऑर्डर करने और डिलीवरी देखने के लिए साइन इन करें।",
  "signIn.forgotPassword": "पासवर्ड भूल गए?",
  "signIn.submitting": "साइन इन हो रहा है…",
  "signIn.orContinueWith": "या इससे जारी रखें",
  "signIn.google": "Google",
  "signIn.failed": "साइन इन नहीं हो सका",
  "signIn.incomplete": "साइन इन पूरा नहीं हो सका। कृपया दोबारा कोशिश करें।",
  "signIn.googleFailed": "Google से जारी नहीं रखा जा सका",

  // Sign up
  "signUp.title": "खाता बनाएँ",
  "signUp.subtitle": "इसमें एक मिनट से भी कम समय लगेगा।",
  "signUp.fullName": "पूरा नाम",
  "signUp.fullNamePlaceholder": "अदिति शर्मा",
  "signUp.nameRequired": "कृपया अपना नाम दर्ज करें",
  "signUp.mobile": "मोबाइल नंबर",
  "signUp.mobilePlaceholder": "98765 43210",
  "signUp.invalidMobile": "कृपया एक वैध मोबाइल नंबर दर्ज करें",
  "signUp.submit": "खाता बनाएँ",
  "signUp.submitting": "खाता बन रहा है…",
  "signUp.failed": "खाता नहीं बनाया जा सका",
  "signUp.incomplete": "खाता बनाना पूरा नहीं हो सका। कृपया दोबारा कोशिश करें।",
  "signUp.verifyTitle": "अपना ईमेल सत्यापित करें",
  "signUp.useDifferentEmail": "दूसरा ईमेल इस्तेमाल करें",
  "signUp.resendFailed": "कोड दोबारा नहीं भेजा जा सका",

  // Code entry
  "verify.title": "अपना कोड दर्ज करें",
  "verify.sentTo": "हमने {email} पर 6 अंकों का कोड भेजा है।",
  "verify.label": "सत्यापन कोड",
  "verify.submit": "सत्यापित करें",
  "verify.submitting": "सत्यापित हो रहा है…",
  "verify.resend": "कोड दोबारा भेजें",
  "verify.startOver": "फिर से शुरू करें",
  "verify.badCode": "यह कोड सही नहीं है",

  // Forgot password
  "reset.needEmail": "अपने खाते का ईमेल पता दर्ज करें।",
  "reset.sendFailed": "रीसेट कोड नहीं भेजा जा सका",
  "reset.requestTitle": "पासवर्ड रीसेट करें",
  "reset.requestSubtitle": "नया पासवर्ड बनाने के लिए हम आपको कोड ईमेल करेंगे।",
  "reset.passwordTitle": "नया पासवर्ड बनाएँ",
  "reset.passwordSubtitle": "ऐसा चुनें जो आपने पहले इस्तेमाल न किया हो।",
  "reset.newPassword": "नया पासवर्ड",
  "reset.send": "रीसेट कोड भेजें",
  "reset.sending": "भेजा जा रहा है…",
  "reset.continue": "आगे बढ़ें",
  "reset.save": "सहेजें और साइन इन करें",
  "reset.saving": "सहेजा जा रहा है…",
  "reset.backToSignIn": "साइन इन पर वापस जाएँ",
  "reset.codeFailed": "यह कोड सत्यापित नहीं हो सका। कृपया दोबारा कोशिश करें।",
  "reset.saveFailed": "नया पासवर्ड सेट नहीं हो सका। कृपया दोबारा कोशिश करें।",
  "reset.setPasswordFailed": "नया पासवर्ड सेट नहीं किया जा सका",

  // Tabs
  "tabs.home": "होम",
  "tabs.subscriptions": "सब्सक्रिप्शन",
  "tabs.insights": "जानकारी",
  "tabs.settings": "सेटिंग्स",

  // Home
  "home.balance": "बैलेंस",
  "home.upcoming": "आने वाले",
  "home.allSubscriptions": "सभी सब्सक्रिप्शन",
  "home.noUpcoming": "अभी कोई नवीनीकरण बाकी नहीं है।",
  "home.noSubscriptions": "अभी कोई सब्सक्रिप्शन नहीं है।",
  "home.addSubscription": "सब्सक्रिप्शन जोड़ें",
  "home.viewAll": "सभी देखें",

  // Subscriptions
  "subs.title": "सब्सक्रिप्शन",
  "subs.subtitle": "हर बार-बार होने वाले भुगतान पर नज़र रखें",
  "subs.searchLabel": "सब्सक्रिप्शन खोजें",
  "subs.searchPlaceholder": "नाम या श्रेणी से खोजें",
  "subs.clearSearch": "खोज हटाएँ",
  "subs.countOne": "{count} सब्सक्रिप्शन",
  "subs.countOther": "{count} सब्सक्रिप्शन",
  "subs.emptyTitle": "कोई सब्सक्रिप्शन नहीं मिला",
  "subs.emptyBody": "कोई दूसरा नाम, श्रेणी या स्थिति आज़माएँ।",
  "subs.notFound": "सब्सक्रिप्शन नहीं मिला",
  "subs.notFoundBody": "इस पेज के लिए एक वैध सब्सक्रिप्शन आईडी चाहिए।",
  "subs.back": "सब्सक्रिप्शन पर वापस जाएँ",
  "subs.details": "सब्सक्रिप्शन विवरण",

  // Insights
  "insights.title": "जानकारी",

  // Settings
  "settings.title": "सेटिंग्स",
  "settings.account": "खाता",
  "settings.accountId": "खाता आईडी",
  "settings.joined": "शामिल हुए",
  "settings.signOut": "साइन आउट",
  "settings.language": "ऐप की भाषा",
  "settings.notAvailable": "उपलब्ध नहीं",
};

export const translations: Record<Language, Record<TranslationKey, string>> = {
  en,
  hi,
};
