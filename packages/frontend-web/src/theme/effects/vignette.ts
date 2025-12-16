/**
 * Vignette Effect
 * Creates a candle-lit, darkened edge effect
 */

import { CSSProperties } from 'react';

export interface VignetteOptions {
  enabled: boolean;
  intensity: number;
  color?: string;
  spread?: number;
}

/** Get CSS for vignette container */
export const getVignetteStyles = (_options: VignetteOptions): CSSProperties => ({
  position: 'relative',
});

/** Generate vignette overlay CSS */
export const getVignetteOverlayCSS = (options: VignetteOptions): string => {
  if (!options.enabled) return '';
  
  const color = options.color || 'rgba(0, 0, 0, 1)';
  const spread = options.spread || 40;
  const intensity = options.intensity;
  
  return `
    .vignette-overlay::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 9999;
      background: radial-gradient(
        ellipse at center,
        transparent 0%,
        transparent ${100 - spread}%,
        ${color.replace('1)', `${intensity * 0.5})`)} ${100 - spread / 2}%,
        ${color.replace('1)', `${intensity})`)} 100%
      );
    }
  `;
};

/** Candle flicker animation CSS */
export const getCandleFlickerCSS = (): string => `
  @keyframes candleFlicker {
    0%, 100% {
      opacity: 0.4;
    }
    25% {
      opacity: 0.35;
    }
    50% {
      opacity: 0.42;
    }
    75% {
      opacity: 0.38;
    }
  }
  
  .vignette-candle::before {
    animation: candleFlicker 3s ease-in-out infinite;
  }
`;

/** Castle torch glow effect */
export const getTorchGlowCSS = (color: string = '#c9a227'): string => `
  .torch-glow {
    box-shadow: 
      0 0 20px ${color}40,
      0 0 40px ${color}20,
      0 0 60px ${color}10;
  }
`;


