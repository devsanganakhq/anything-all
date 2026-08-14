// Heathland Links — Global Design Tokens
// All screens must import from this file to ensure visual consistency.

export const Colors = {
  // Backgrounds
  ivory: "#F5F1EB",
  ivoryDeep: "#EDE8DF",
  white: "#FFFFFF",

  // Brand
  green: "#1B3828",
  greenMid: "#2C4E3A",
  greenLight: "rgba(27, 56, 40, 0.07)",
  greenBorder: "rgba(27, 56, 40, 0.15)",

  // Accent — heather purple, used sparingly
  purple: "#6B4F8A",
  purpleLight: "rgba(107, 79, 138, 0.1)",
  purpleBorder: "rgba(107, 79, 138, 0.25)",

  // Text
  textPrimary: "#1B2E22",
  textSecondary: "#7A8570",
  textMuted: "#A89F93",
  textInverse: "#F5F1EB",

  // Borders & Dividers
  border: "#E3DED5",
  borderLight: "#EDE8DF",
  divider: "#F0EBE3",

  // Status
  gold: "#C9A84C",
  goldLight: "rgba(201, 168, 76, 0.12)",
  error: "#C0392B",
  success: "#2C6E49",
};

export const Typography = {
  // Serif — major headings, course names, feature text
  serif: {
    h1: {
      fontSize: 34,
      fontWeight: "300",
      fontStyle: "italic",
      color: Colors.textPrimary,
      lineHeight: 40,
    },
    h2: {
      fontSize: 26,
      fontWeight: "300",
      fontStyle: "italic",
      color: Colors.textPrimary,
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: "400",
      fontStyle: "italic",
      color: Colors.textPrimary,
      lineHeight: 26,
    },
  },
  // Sans — UI, labels, body
  sans: {
    label: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.5,
      color: Colors.textSecondary,
    },
    caption: { fontSize: 12, fontWeight: "400", color: Colors.textSecondary },
    body: {
      fontSize: 14,
      fontWeight: "400",
      color: Colors.textPrimary,
      lineHeight: 22,
    },
    bodyMedium: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
    bodyLarge: { fontSize: 16, fontWeight: "400", color: Colors.textPrimary },
    button: { fontSize: 12, fontWeight: "700", letterSpacing: 1.5 },
    stat: { fontSize: 24, fontWeight: "700", color: Colors.textPrimary },
    statSmall: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary },
  },
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 50,
};

export const Shadow = {
  card: {
    shadowColor: "#1B2E22",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  float: {
    shadowColor: "#1B2E22",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Floating bottom tab bar geometry (iOS + Android identical).
export const TabBar = {
  height: 62,
  radius: 26,
  inset: 14, // horizontal gap from screen edges
  lift: 10, // gap above the safe-area bottom
};

// Space a screen must leave at the bottom so content clears the floating bar.
// Usage: paddingBottom: insets.bottom + TAB_BAR_CLEARANCE
export const TAB_BAR_CLEARANCE = TabBar.height + TabBar.lift + 12;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  screenH: 20, // horizontal screen padding
};
