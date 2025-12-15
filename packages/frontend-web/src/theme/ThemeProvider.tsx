/**
 * Theme Provider
 * React context for theme system
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, ThemeContextValue } from './theme';
import { cursedCastleSpirit } from './themes/cursedCastleSpirit';
import { getVignetteOverlayCSS, getCandleFlickerCSS } from './effects/vignette';
import { getGrainOverlayCSS, getGrainAnimationCSS } from './effects/grain';
import { getDitherOverlayCSS } from './effects/dither';
import { pixelScaleClass } from './effects/pixelScale';

// Available themes registry
const THEMES: Record<string, Theme> = {
  'cursed-castle-spirit': cursedCastleSpirit,
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  defaultTheme = 'cursed-castle-spirit' 
}) => {
  const [currentThemeId, setCurrentThemeId] = useState(defaultTheme);
  const theme = THEMES[currentThemeId] || cursedCastleSpirit;

  // Inject theme CSS variables and effects
  useEffect(() => {
    const styleId = 'castle-theme-styles';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    const { palette, effects } = theme;

    const cssVariables = `
      :root {
        --castle-bg: ${palette.background};
        --castle-bg-alt: ${palette.backgroundAlt};
        --castle-surface: ${palette.surface};
        --castle-surface-alt: ${palette.surfaceAlt};
        --castle-text: ${palette.textPrimary};
        --castle-text-secondary: ${palette.textSecondary};
        --castle-text-muted: ${palette.textMuted};
        --castle-text-accent: ${palette.textAccent};
        --castle-border: ${palette.border};
        --castle-border-strong: ${palette.borderStrong};
        --castle-frame: ${palette.frame};
        --castle-frame-highlight: ${palette.frameHighlight};
        --castle-frame-shadow: ${palette.frameShadow};
        --castle-success: ${palette.success};
        --castle-warning: ${palette.warning};
        --castle-danger: ${palette.danger};
        --castle-info: ${palette.info};
        --castle-accent1: ${palette.accent1};
        --castle-accent2: ${palette.accent2};
        --castle-accent3: ${palette.accent3};
      }
    `;

    const effectsCSS = [
      pixelScaleClass,
      effects.vignette ? getVignetteOverlayCSS({ 
        enabled: true, 
        intensity: effects.vignetteIntensity 
      }) : '',
      effects.vignette ? getCandleFlickerCSS() : '',
      effects.grain ? getGrainOverlayCSS({ 
        enabled: true, 
        opacity: effects.grainOpacity,
        animated: true 
      }) : '',
      effects.grain ? getGrainAnimationCSS() : '',
      effects.dither ? getDitherOverlayCSS({ 
        enabled: true, 
        opacity: effects.ditherOpacity,
        pattern: 'bayer4'
      }) : '',
    ].join('\n');

    styleEl.textContent = cssVariables + effectsCSS;

    // Apply theme class to body
    document.body.classList.add('castle-theme');
    if (effects.pixelScale) {
      document.body.classList.add('pixel-scale');
    }

    return () => {
      document.body.classList.remove('castle-theme', 'pixel-scale');
    };
  }, [theme]);

  const value: ThemeContextValue = {
    theme,
    setTheme: setCurrentThemeId,
    availableThemes: Object.keys(THEMES),
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeProvider;
