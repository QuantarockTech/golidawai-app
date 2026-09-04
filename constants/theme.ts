export const colors = {
  background: "#fff9e3",
  foreground: "#081126",
  card: "#fff8e7",
  muted: "#f6eecf",
  mutedForeground: "rgba(0, 0, 0, 0.6)",
  primary: "#081126",
  accent: "#ea7a53",
  border: "rgba(0, 0, 0, 0.1)",
  success: "#059652",
  destructive: "#dc2626",
  subscription: "#8fd1bd",

  // GoliDawayi brand system — mirrors the @theme block in global.css. Duplicated
  // here because icon and gradient props take JS values, not class names; keep
  // the two in step.
  brand: "#3fbbc0",
  brandDark: "#0f5d61",
  brandLight: "#65c9cd",
  brandInk: "#04302f",
  mist: "#f7fcfc",
  ink: "#152a27",
  inkMuted: "#5c7573",
  inkFaint: "#8fa3a1",
  emergency: "#df1529",
  whatsapp: "#25d366",
  hairlineSoft: "rgba(15, 60, 61, 0.08)",
  white: "#ffffff",
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  18: 72,
  20: 80,
  24: 96,
  30: 120,
} as const;

export const components = {
  /*
   * Tab bar per concept board frame 04: a flat white strip with a hairline top
   * border, not the starter template's floating dark pill. `height` is the bar
   * itself, excluding the safe-area inset the screen adds beneath it — the
   * WhatsApp button offsets itself from the same number.
   */
  tabBar: {
    // 60, not 56: paddingTop + a 24px icon + the label needs the extra few
    // pixels, or the label clips against the bottom edge on a device with no
    // gesture inset to pad it.
    height: 60,
    iconSize: spacing[6],
    paddingTop: 6,
    labelSize: 11,
  },
} as const;

export const theme = {
  colors,
  spacing,
  components,
} as const;
