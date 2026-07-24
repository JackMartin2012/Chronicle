/**
 * Chronicle — Design Tokens
 *
 * Single source of truth for colour, type, spacing and radii.
 * Never hardcode a colour or a font size in a screen file — add it here.
 *
 * See CHRONICLE_DESIGN_SPEC.md for the rules these tokens encode.
 */

// ---------------------------------------------------------------------------
// PALETTE
// ---------------------------------------------------------------------------

export const palette = {
  // Your Past — retro, nostalgic
  pastBg: '#17102a',
  pastSurface: '#1e1636',
  pastAccent: '#9b72ff',

  // Your Present — modern, forward
  presentBg: '#0b1526',
  presentSurface: '#101c33',
  presentAccent: '#4a90d9',

  // Capsules only. Never use this anywhere else.
  capsuleGold: '#f5c842',

  // Text
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.70)',
  textMuted: 'rgba(255,255,255,0.40)',
  textFaint: 'rgba(255,255,255,0.25)',

  // Structure
  hairline: 'rgba(255,255,255,0.08)',
  ringSubtle: 'rgba(255,255,255,0.15)',

  // Physical objects (diegetic — see spec §2)
  polaroidFrame: '#f2e9db',
  polaroidInk: '#2a2622',
  paperCream: '#f3ece0',

  danger: '#ff4444',
} as const;

// ---------------------------------------------------------------------------
// TYPOGRAPHY
// ---------------------------------------------------------------------------
// Match these family strings to whatever is registered in your font loader.

export const fonts = {
  // Your Past — editorial serif
  pastLight: 'Fraunces_300Light',
  pastRegular: 'Fraunces_400Regular',
  pastMedium: 'Fraunces_600SemiBold',
  pastBold: 'Fraunces_800ExtraBold',

  // Your Present — geometric sans
  presentLight: 'SpaceGrotesk_300Light',
  presentRegular: 'SpaceGrotesk_400Regular',
  presentMedium: 'SpaceGrotesk_600SemiBold',
  presentBold: 'SpaceGrotesk_700Bold',

  // Diegetic only — polaroid captions. Never in UI chrome.
  handwriting: 'Caveat_400Regular',

  // Diegetic only — newspaper masthead (slide 8, both worlds).
  // NOTE: this means Fraunces must be loaded even in the Present world.
  masthead: 'Fraunces_800ExtraBold',
  mastheadBody: 'Fraunces_400Regular',
} as const;

/**
 * Type scale. Sizes are shared across both worlds; only the family changes.
 *
 * NOTE: `caption` (12pt) and `micro` (11pt) fall below FRAUNCES_MIN_SIZE (13).
 * They read fine in the Present world (Space Grotesk), but the Past world will
 * need a larger size override for these two when the Past day-card variant is
 * built — otherwise Fraunces renders below its legibility floor.
 */
export const type = {
  dateHero: { fontSize: 52, lineHeight: 56, letterSpacing: -1.5 },
  wordHero: { fontSize: 46, lineHeight: 58, letterSpacing: -1 },
  statFigure: { fontSize: 30, lineHeight: 34, letterSpacing: -0.5 },
  title: { fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  headline: { fontSize: 20, lineHeight: 27, letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 25, letterSpacing: 0 },
  bodySmall: { fontSize: 15, lineHeight: 23, letterSpacing: 0 },
  label: { fontSize: 13, lineHeight: 17, letterSpacing: 0.2 },
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.2 }, // below FRAUNCES_MIN_SIZE — Past needs an override (see note above)
  micro: { fontSize: 11, lineHeight: 14, letterSpacing: 0.3 }, // below FRAUNCES_MIN_SIZE — Past needs an override (see note above)
} as const;

// Fraunces needs a floor — never below 13pt, letterSpacing never above 0.5.
export const FRAUNCES_MIN_SIZE = 13;
export const FRAUNCES_MAX_TRACKING = 0.5;

// ---------------------------------------------------------------------------
// SPACING — 4pt base
// ---------------------------------------------------------------------------

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  section: 40,     // between major blocks on a slide
  screenX: 20,     // standard horizontal screen padding
} as const;

// ---------------------------------------------------------------------------
// RADII
// ---------------------------------------------------------------------------

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  hero: 28,        // full-bleed photos on slide 2
  pill: 999,
} as const;

// ---------------------------------------------------------------------------
// COMPONENT CONSTANTS
// ---------------------------------------------------------------------------

export const sizes = {
  personLarge: 72,       // people row, slide 7 lower strip
  personMedium: 52,
  personOnMap: 44,       // portraits pinned to map stops
  personSmall: 36,
  thumbnail: 56,         // camera roll strip
  selfieInset: 100,      // BeReal inset, slide 2
  globeDiameter: 240,
  artwork: 0.65,         // fraction of screen width, slide 6
  polaroid: 0.65,        // fraction of screen width, slide 3
  mapStrip: 130,
  pageDot: 6,
  pageDotActive: 7,
} as const;

export const motion = {
  pressScale: 0.97,
  springSpeed: 50,
  springBounciness: 4,
  fadeMs: 220,
  slideMs: 320,
} as const;

// Opacity used for dimming non-focused items (e.g. unselected words, slide 4)
export const dim = {
  inactive: 0.4,
  resting: 0.7,
  full: 1,
} as const;

// ---------------------------------------------------------------------------
// WORLDS
// ---------------------------------------------------------------------------

export type World = 'past' | 'present';

export const worlds = {
  past: {
    bg: palette.pastBg,
    surface: palette.pastSurface,
    accent: palette.pastAccent,
    fontLight: fonts.pastLight,
    fontRegular: fonts.pastRegular,
    fontMedium: fonts.pastMedium,
    fontBold: fonts.pastBold,
    mapStyle: 'parchment',
  },
  present: {
    bg: palette.presentBg,
    surface: palette.presentSurface,
    accent: palette.presentAccent,
    fontLight: fonts.presentLight,
    fontRegular: fonts.presentRegular,
    fontMedium: fonts.presentMedium,
    fontBold: fonts.presentBold,
    mapStyle: 'dark',
  },
} as const;

export const getWorld = (world: World) => worlds[world];

// ---------------------------------------------------------------------------
// WEATHER-REACTIVE GLOW (slide 1)
// ---------------------------------------------------------------------------
// Returns a tint that BLENDS with the world accent — it must never replace
// it, or the two worlds converge. See spec §3, slide 1.

export type WeatherKind = 'hot' | 'cold' | 'rain' | 'snow' | 'mild';

export const weatherGlow: Record<WeatherKind, string> = {
  hot: 'rgba(245,180,90,0.45)',
  cold: 'rgba(190,225,255,0.40)',
  rain: 'rgba(120,140,165,0.35)',
  snow: 'rgba(225,235,250,0.30)',
  mild: 'rgba(255,255,255,0.00)',
};

export const weatherFromTemp = (
  tempC?: number,
  condition?: string
): WeatherKind => {
  if (condition?.includes('snow')) return 'snow';
  if (condition?.includes('rain') || condition?.includes('storm')) return 'rain';
  if (typeof tempC !== 'number') return 'mild';
  if (tempC >= 25) return 'hot';
  if (tempC < 5) return 'cold';
  return 'mild';
};

export const theme = {
  palette,
  fonts,
  type,
  space,
  radius,
  sizes,
  motion,
  dim,
  worlds,
  getWorld,
  weatherGlow,
  weatherFromTemp,
};

export default theme;
