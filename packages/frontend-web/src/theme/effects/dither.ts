/**
 * Dither Effect
 * Applies ordered dithering or noise texture overlay
 */

import { CSSProperties } from 'react';

export interface DitherOptions {
  enabled: boolean;
  opacity: number;
  pattern: 'bayer4' | 'bayer8' | 'noise';
}

/** 4x4 Bayer dithering pattern as data URI */
const BAYER_4X4_PATTERN = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkYGD4z8DAwMgABYwMEIYHhMHAAAL/GWAMAAAeqQMvvNQDVwAAAABJRU5ErkJggg==`;

/** 8x8 Bayer dithering pattern as data URI */
const BAYER_8X8_PATTERN = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAQ0lEQVQYV2NkYGBg+M/AwMDIgAQYkQQZIAxGBgYGRgYoAyT4HwIYGBkZGP4jC4IYIAZIEMRnhDBAAmBBkA2MDCABAG3kDCftoWNRAAAAAElFTkSuQmCC`;

const getPattern = (pattern: DitherOptions['pattern']): string => {
  switch (pattern) {
    case 'bayer4':
      return BAYER_4X4_PATTERN;
    case 'bayer8':
      return BAYER_8X8_PATTERN;
    case 'noise':
    default:
      return BAYER_4X4_PATTERN;
  }
};

/** Get CSS for dither overlay */
export const getDitherStyles = (options: DitherOptions): CSSProperties => {
  if (!options.enabled) return {};
  
  return {
    position: 'relative',
  };
};

/** CSS class for dither effect overlay */
export const getDitherOverlayCSS = (options: DitherOptions): string => {
  if (!options.enabled) return '';
  
  const pattern = getPattern(options.pattern);
  
  return `
    .dither-overlay::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      background-image: url("${pattern}");
      background-repeat: repeat;
      opacity: ${options.opacity};
      mix-blend-mode: overlay;
      image-rendering: pixelated;
    }
  `;
};

/** Generate inline SVG noise pattern */
export const generateNoisePattern = (size: number = 64): string => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const value = Math.random() > 0.5 ? 255 : 0;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 20;
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
};












