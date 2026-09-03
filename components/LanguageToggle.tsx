import clsx from "clsx";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage } from "@/contexts/LanguageContext";
import { LANGUAGES, LANGUAGE_LABELS } from "@/lib/i18n/translations";

/** Gap between the status bar / notch and the pinned toggle. */
const FLOATING_GAP = 8;

type LanguageToggleProps = {
  /** "dark" sits on the teal hero; "light" on every mist/cream screen. */
  tone?: "dark" | "light";
  /** Pin to the top-right corner instead of flowing inline. Hero only. */
  floating?: boolean;
};

const ACCESSIBILITY_LABELS: Record<(typeof LANGUAGES)[number], string> = {
  en: "English",
  hi: "हिंदी",
};

/**
 * EN/हिं switch — concept board frame 01, and per frame 04's note it belongs in
 * the header of every screen so the language can be changed at any point rather
 * than only before sign-in.
 */
const LanguageToggle = ({
  tone = "light",
  floating = false,
}: LanguageToggleProps) => {
  const { language, setLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const onLight = tone === "light";

  return (
    <View
      className={clsx(
        "ga-lang",
        onLight && "ga-lang-on-light",
        floating && "ga-lang-floating",
      )}
      /*
       * Measured from the top of the screen, so the caller must render this
       * outside any SafeAreaView padding or the inset is counted twice.
       */
      style={floating ? { top: insets.top + FLOATING_GAP } : undefined}
    >
      {LANGUAGES.map((code) => {
        const isActive = code === language;

        return (
          <Pressable
            key={code}
            className={clsx(
              "ga-lang-item",
              isActive && (onLight ? "ga-lang-item-active-on-light" : "ga-lang-item-active"),
            )}
            onPress={() => setLanguage(code)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={ACCESSIBILITY_LABELS[code]}
            hitSlop={6}
          >
            <Text
              className={clsx(
                "ga-lang-text",
                // Only the Latin label opts into Poppins; हिं needs the
                // platform font to guarantee Devanagari coverage.
                code === "en" && "ga-lang-text-latin",
                onLight && "ga-lang-text-on-light",
                isActive &&
                  (onLight ? "ga-lang-text-active-on-light" : "ga-lang-text-active"),
              )}
            >
              {LANGUAGE_LABELS[code]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export default LanguageToggle;
