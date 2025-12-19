/**
 * Cursed Castle Spirit Theme
 * Quest for Glory-inspired pixel-art adventure game aesthetic
 */

import { Theme } from '../theme';

export const cursedCastleSpirit: Theme = {
  id: 'cursed-castle-spirit',
  name: 'Cursed Castle Spirit',
  description: 'A haunted castle where spirits guide your chess journey',
  
  palette: {
    // Dark stone castle backgrounds
    background: '#1a1a2e',
    backgroundAlt: '#16213e',
    surface: '#252a40',
    surfaceAlt: '#2d3250',
    
    // Ghostly text colors
    textPrimary: '#e8e8e8',
    textSecondary: '#b8b8c8',
    textMuted: '#7a7a8a',
    textAccent: '#9fd3c7',
    
    // Stone and brass UI
    border: '#4a4a5a',
    borderStrong: '#6a6a7a',
    frame: '#3d3d50',
    frameHighlight: '#5a5a70',
    frameShadow: '#1a1a28',
    
    // Game state colors (muted, medieval)
    success: '#4a9c6d',
    warning: '#c9a227',
    danger: '#9c4a4a',
    info: '#4a7a9c',
    
    // Chess board - aged wood/stone
    squareLight: '#c9b896',
    squareDark: '#7a6c5a',
    highlightMove: 'rgba(154, 205, 50, 0.5)',
    highlightThreat: 'rgba(180, 60, 60, 0.5)',
    highlightHint: 'rgba(100, 149, 237, 0.4)',
    
    // Magical accents
    accent1: '#9fd3c7', // Spectral teal
    accent2: '#c9a227', // Candlelight gold
    accent3: '#8b5cf6', // Mystic purple
  },
  
  metrics: {
    panelPadding: 12,
    panelBorderRadius: 4,
    frameThickness: 3,
    buttonHeight: 36,
    iconSize: 20,
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 24,
    },
  },
  
  typography: {
    fontFamily: '"Press Start 2P", "Courier New", monospace',
    fontFamilyMono: '"Courier New", monospace',
    fontFamilyDisplay: '"Press Start 2P", monospace',
    fontSize: {
      xs: '10px',
      sm: '12px',
      md: '14px',
      lg: '16px',
      xl: '20px',
      xxl: '24px',
    },
    lineHeight: 1.6,
    letterSpacing: '0.5px',
  },
  
  effects: {
    pixelScale: true,
    pixelScaleFactor: 2,
    dither: true,
    ditherOpacity: 0.08,
    vignette: true,
    vignetteIntensity: 0.4,
    grain: true,
    grainOpacity: 0.05,
    scanlines: false,
    scanlinesOpacity: 0.1,
    // CRT monitor effects
    crtEnabled: true,
    crtScanlines: true,
    crtFlicker: false, // Disabled by default - can be jarring
    crtFlickerIntensity: 0.02,
  },
  
  narrator: {
    packId: 'castle_spirit',
    defaultTone: 'gothic',
    typewriterSpeed: 30,
    showPortrait: true,
  },
};

export default cursedCastleSpirit;




