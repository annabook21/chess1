/**
 * CRT Filter Effect
 * WebGL-based CRT screen simulation for authentic retro feel
 * 
 * Based on research: CRTFilter library provides scanlines, barrel distortion,
 * chromatic aberration, and other CRT effects via WebGL shaders.
 * 
 * This module provides a simpler CSS-based fallback that works without WebGL,
 * plus integration hooks for the full WebGL library if available.
 */

export interface CRTFilterOptions {
  enabled: boolean;
  scanlines: boolean;
  scanlineIntensity: number;
  curvature: boolean;
  curvatureAmount: number;
  flickerEnabled: boolean;
  flickerIntensity: number;
  rgbShift: boolean;
  rgbShiftAmount: number;
  vignette: boolean;
  vignetteIntensity: number;
}

export const DEFAULT_CRT_OPTIONS: CRTFilterOptions = {
  enabled: true,
  scanlines: true,
  scanlineIntensity: 0.15,
  curvature: false, // Curvature requires WebGL
  curvatureAmount: 0.02,
  flickerEnabled: true,
  flickerIntensity: 0.03,
  rgbShift: false, // RGB shift requires WebGL
  rgbShiftAmount: 0.5,
  vignette: true,
  vignetteIntensity: 0.3,
};

/** Generate CSS for scanline overlay */
const getScanlineCSS = (intensity: number): string => `
  .crt-scanlines::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 9990;
    background: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, ${intensity}) 0px,
      rgba(0, 0, 0, ${intensity}) 1px,
      transparent 1px,
      transparent 2px
    );
    background-size: 100% 2px;
  }
`;

/** Generate CSS for screen flicker */
const getFlickerCSS = (intensity: number): string => `
  @keyframes crtFlicker {
    0%, 100% { opacity: 1; }
    50% { opacity: ${1 - intensity}; }
    52% { opacity: 1; }
    54% { opacity: ${1 - intensity * 0.5}; }
  }
  
  .crt-flicker {
    animation: crtFlicker 0.1s infinite;
  }
`;

/** Generate CSS for CRT vignette (darker edges) */
const getCRTVignetteCSS = (intensity: number): string => `
  .crt-vignette::after {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 9991;
    background: radial-gradient(
      ellipse at center,
      transparent 50%,
      rgba(0, 0, 0, ${intensity * 0.5}) 80%,
      rgba(0, 0, 0, ${intensity}) 100%
    );
  }
`;

/** Generate CSS for phosphor glow effect */
const getPhosphorGlowCSS = (): string => `
  .crt-phosphor {
    text-shadow: 
      0 0 2px rgba(159, 211, 199, 0.5),
      0 0 4px rgba(159, 211, 199, 0.3);
  }
  
  .crt-phosphor-strong {
    text-shadow: 
      0 0 2px rgba(159, 211, 199, 0.8),
      0 0 6px rgba(159, 211, 199, 0.5),
      0 0 10px rgba(159, 211, 199, 0.3);
  }
`;

/** Generate CSS for subtle screen curvature (CSS approximation) */
const getCurvatureCSS = (): string => `
  .crt-curved {
    border-radius: 20px;
    overflow: hidden;
  }
  
  .crt-curved::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 9989;
    box-shadow: inset 0 0 100px rgba(0, 0, 0, 0.3);
    border-radius: 20px;
  }
`;

/** Generate all CRT effect CSS */
export const getCRTFilterCSS = (options: CRTFilterOptions): string => {
  if (!options.enabled) return '';
  
  const parts: string[] = [];
  
  if (options.scanlines) {
    parts.push(getScanlineCSS(options.scanlineIntensity));
  }
  
  if (options.flickerEnabled) {
    parts.push(getFlickerCSS(options.flickerIntensity));
  }
  
  if (options.vignette) {
    parts.push(getCRTVignetteCSS(options.vignetteIntensity));
  }
  
  if (options.curvature) {
    parts.push(getCurvatureCSS());
  }
  
  // Always include phosphor glow for text
  parts.push(getPhosphorGlowCSS());
  
  return parts.join('\n');
};

/** Apply CRT classes to an element */
export const applyCRTClasses = (
  element: HTMLElement, 
  options: CRTFilterOptions
): void => {
  const classes = ['crt-effect'];
  
  if (options.scanlines) classes.push('crt-scanlines');
  if (options.flickerEnabled) classes.push('crt-flicker');
  if (options.vignette) classes.push('crt-vignette');
  if (options.curvature) classes.push('crt-curved');
  
  element.classList.add(...classes);
};

/** Remove CRT classes from an element */
export const removeCRTClasses = (element: HTMLElement): void => {
  element.classList.remove(
    'crt-effect',
    'crt-scanlines', 
    'crt-flicker', 
    'crt-vignette',
    'crt-curved'
  );
};

/**
 * For full WebGL CRT effects, you would integrate CRTFilter library:
 * 
 * import { CRTFilterWebGL } from 'crt-filter';
 * 
 * const canvas = document.getElementById('game-canvas');
 * const crt = new CRTFilterWebGL(canvas, {
 *   barrelDistortion: 0.001,
 *   chromaticAberration: 0.0005,
 *   scanlineIntensity: 0.6,
 *   // ... more options
 * });
 * crt.start();
 * 
 * This CSS-based version provides a lighter-weight alternative
 * that works on all devices without WebGL support.
 */
