import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { clsx } from "clsx";
import { useRef, useState } from "react";
import { Pressable, TextInput, View, type TextInputProps } from "react-native";

import { colors } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { pressSmall } from "@/lib/press";

/** Everything a password box takes, minus the masking this owns. */
type PasswordFieldProps = Omit<TextInputProps, "secureTextEntry">;

/**
 * A password box that can show what was typed.
 *
 * Masked input on a phone keyboard is where sign-ins go to die: nobody can see
 * the typo, so a mistyped password and a wrong password look exactly alike.
 * The eye lets someone check before submitting, and hide it again for whoever
 * is reading over their shoulder.
 *
 * The button sits *over* the field rather than beside it. `.ga-input` carries
 * the border, and on web the focus ring is written as `input.ga-input:focus` —
 * moving the border onto a wrapper row would leave that ring matching nothing.
 * So the input keeps its own class and only gains room on the right.
 */
const PasswordField = ({
  className,
  onFocus,
  onBlur,
  ...props
}: PasswordFieldProps) => {
  const { t } = useLanguage();
  const [revealed, setRevealed] = useState(false);
  const input = useRef<TextInput>(null);
  /** Whether the box has the cursor right now. */
  const focused = useRef(false);
  /** Whether it had the cursor when the eye was pressed — see onPressIn. */
  const wasFocused = useRef(false);

  return (
    <View className="ga-input-wrap">
      <TextInput
        ref={input}
        className={clsx(className, "ga-input-secure")}
        secureTextEntry={!revealed}
        {...props}
        onFocus={(event) => {
          focused.current = true;
          onFocus?.(event);
        }}
        onBlur={(event) => {
          focused.current = false;
          onBlur?.(event);
        }}
      />

      <Pressable
        className="ga-input-eye"
        style={pressSmall}
        /*
         * Taken on the way down, not in onPress. A web browser moves focus out
         * of the field as its default action for the same click, so by the time
         * the press lands the answer is already gone.
         */
        onPressIn={() => {
          wasFocused.current = focused.current;
        }}
        onPress={() => {
          setRevealed((shown) => !shown);
          /*
           * Give the cursor back, so revealing halfway through a password does
           * not mean clicking into the box again to finish typing it. Native
           * never loses it — these screens' ScrollViews persist taps — and
           * focusing something already focused does nothing there.
           */
          if (wasFocused.current) input.current?.focus();
        }}
        accessibilityRole="button"
        accessibilityLabel={t(
          revealed ? "auth.hidePassword" : "auth.showPassword",
        )}
        hitSlop={6}
      >
        <MaterialCommunityIcons
          name={revealed ? "eye-off-outline" : "eye-outline"}
          size={20}
          color={colors.inkFaint}
        />
      </Pressable>
    </View>
  );
};

export default PasswordField;
