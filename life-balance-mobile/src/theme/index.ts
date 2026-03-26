import { StyleSheet, Platform } from 'react-native';

// ─── Color palette ─────────────────────────────────────────────────────────────

export const Colors = {
  // Paper tones
  paper:    '#faf8f4',
  paper2:   '#f3f0ea',
  paper3:   '#e8e4dc',
  rule:     '#ddd8d0',

  // Ink tones
  ink:      '#1c1917',
  ink2:     '#44403c',
  ink3:     '#78716c',
  ink4:     '#a8a29e',

  // Semantic
  teal:       '#0d9068',
  tealLight:  '#e0f4ed',
  amber:      '#b45309',
  amberLight: '#fef3c7',
  red:        '#b91c1c',
  redLight:   '#fee2e2',

  // TLI palette (matches web)
  tli: [
    '#7F77DD',
    '#1D9E75',
    '#D85A30',
    '#BA7517',
    '#378ADD',
    '#639922',
    '#D4537E',
  ],
};

// ─── Typography ────────────────────────────────────────────────────────────────

export const Fonts = {
  display:       'System',
  displayItalic: 'System',
  mono:          'monospace',
  monoMedium:    'monospace',
  body:          'System',
  bodyMedium:    'System',
  bodyBold:      'System',
};

// ─── Spacing ───────────────────────────────────────────────────────────────────

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
};

// ─── Radius ────────────────────────────────────────────────────────────────────

export const Radius = {
  sm:  4,
  md:  8,
  lg:  12,
  xl:  16,
  full: 999,
};

// ─── Shadows ───────────────────────────────────────────────────────────────────

export const Shadow = {
  sm: Platform.select({
    ios: {
      shadowColor: Colors.ink,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
    android: { elevation: 2 },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: Colors.ink,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.10,
      shadowRadius: 8,
    },
    android: { elevation: 4 },
    default: {},
  }),
};

// ─── Common shared styles ──────────────────────────────────────────────────────

export const Common = StyleSheet.create({
  // Cards
  card: {
    backgroundColor: Colors.paper,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.rule,
    padding: Spacing.lg,
  },
  cardSecondary: {
    backgroundColor: Colors.paper2,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.rule,
    padding: Spacing.lg,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Text styles
  displayTitle: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.ink,
    letterSpacing: -0.4,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.ink,
    fontWeight: '400',
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.ink4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bodyText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.ink2,
    lineHeight: 21,
  },
  monoText: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: Colors.ink,
  },
  monoMuted: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.ink3,
  },

  // Buttons
  btnPrimary: {
    backgroundColor: Colors.ink,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: Colors.paper,
  },
  btnSecondary: {
    backgroundColor: Colors.paper,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.rule,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.ink2,
  },

  // Tags / badges
  tag: {
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    fontWeight: '500',
  },

  // Screen
  screen: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  screenPadded: {
    flex: 1,
    backgroundColor: Colors.paper,
    paddingHorizontal: Spacing.lg,
  },

  // Section header
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.paper2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.rule,
  },

  // Divider
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.rule,
    marginVertical: Spacing.md,
  },

  // Empty state
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.xxl,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.ink3,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.ink4,
    textAlign: 'center',
    lineHeight: 18,
  },
});
