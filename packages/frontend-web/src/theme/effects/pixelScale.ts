/**
 * Pixel Scale Effect
 * Applies retro pixel-art scaling to elements
 */

import { CSSProperties } from 'react';

export interface PixelScaleOptions {
  enabled: boolean;
  factor: number;
}

/** CSS properties for pixel-perfect rendering */
export const getPixelScaleStyles = (options: PixelScaleOptions): CSSProperties => {
  if (!options.enabled) return {};
  
  return {
    imageRendering: 'pixelated',
  };
};

/** CSS class string for pixel scaling */
export const pixelScaleClass = `
  .pixel-scale {
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    -webkit-font-smoothing: none;
    -moz-osx-font-smoothing: grayscale;
  }
  
  .pixel-scale img,
  .pixel-scale canvas {
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
`;

/** Apply pixel scaling to a canvas context */
export const applyPixelScaleToCanvas = (
  ctx: CanvasRenderingContext2D,
  _factor: number
): void => {
  ctx.imageSmoothingEnabled = false;
};

/** Calculate scaled dimensions */
export const getScaledDimensions = (
  width: number,
  height: number,
  factor: number
): { width: number; height: number; internalWidth: number; internalHeight: number } => {
  const internalWidth = Math.floor(width / factor);
  const internalHeight = Math.floor(height / factor);
  
  return {
    width,
    height,
    internalWidth,
    internalHeight,
  };
};


