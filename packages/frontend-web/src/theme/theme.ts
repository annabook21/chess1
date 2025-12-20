/**
 * Theme System - Core Types
 * Defines the structure for theming the chess UI
 */

/** Color palette - limited to 16-32 colors for retro feel */
export interface ThemePalette {
  // Primary colors
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceAlt: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textAccent: string;
  
  // UI chrome
  border: string;
  borderStrong: string;
  frame: string;
  frameHighlight: string;
  frameShadow: string;
  
  // Game states
  success: string;
  warning: string;
  danger: string;
  info: string;
  
  // Chess-specific
  squareLight: string;
  squareDark: string;
  highlightMove: string;
  highlightThreat: string;
  highlightHint: string;
  
  // Accents
  accent1: string;
  accent2: string;
  accent3: string;
}

/** UI metrics for panels and frames */
export interface ThemeMetrics {
  panelPadding: number;
  panelBorderRadius: number;
  frameThickness: number;
  buttonHeight: number;
  iconSize: number;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

/** Typography tokens */
export interface ThemeTypography {
  fontFamily: string;
  fontFamilyMono: string;
  fontFamilyDisplay: string;
  fontSize: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  lineHeight: number;
  letterSpacing: string;
}

/** Visual effects toggles */
export interface ThemeEffects {
  pixelScale: boolean;
  pixelScaleFactor: number;
  dither: boolean;
  ditherOpacity: number;
  vignette: boolean;
  vignetteIntensity: number;
  grain: boolean;
  grainOpacity: number;
  scanlines: boolean;
  scanlinesOpacity: number;
  // CRT effects
  crtEnabled: boolean;
  crtScanlines: boolean;
  crtFlicker: boolean;
  crtFlickerIntensity: number;
}

/** Narrator voice configuration */
export interface ThemeNarrator {
  packId: string;
  defaultTone: 'whimsical' | 'gothic' | 'ruthless';
  typewriterSpeed: number;
  showPortrait: boolean;
}

/** Complete theme definition */
export interface Theme {
  id: string;
  name: string;
  description: string;
  palette: ThemePalette;
  metrics: ThemeMetrics;
  typography: ThemeTypography;
  effects: ThemeEffects;
  narrator: ThemeNarrator;
}

/** Theme context for React */
export interface ThemeContextValue {
  theme: Theme;
  setTheme: (themeId: string) => void;
  availableThemes: string[];
}









