/**
 * Film Grain Effect
 * Subtle animated noise overlay for retro feel
 */

export interface GrainOptions {
  enabled: boolean;
  opacity: number;
  animated: boolean;
  size?: number;
}

/** Generate grain overlay CSS */
export const getGrainOverlayCSS = (options: GrainOptions): string => {
  if (!options.enabled) return '';
  
  const size = options.size || 150;
  
  return `
    .grain-overlay::after {
      content: '';
      position: fixed;
      top: -50%;
      left: -50%;
      right: -50%;
      bottom: -50%;
      width: 200%;
      height: 200%;
      pointer-events: none;
      z-index: 9998;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 ${size} ${size}' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
      opacity: ${options.opacity};
      ${options.animated ? 'animation: grainShift 0.5s steps(1) infinite;' : ''}
    }
  `;
};

/** Grain animation keyframes */
export const getGrainAnimationCSS = (): string => `
  @keyframes grainShift {
    0%, 100% {
      transform: translate(0, 0);
    }
    10% {
      transform: translate(-2%, -2%);
    }
    20% {
      transform: translate(2%, 2%);
    }
    30% {
      transform: translate(-1%, 1%);
    }
    40% {
      transform: translate(1%, -1%);
    }
    50% {
      transform: translate(-2%, 1%);
    }
    60% {
      transform: translate(2%, -2%);
    }
    70% {
      transform: translate(0, 2%);
    }
    80% {
      transform: translate(-1%, 0);
    }
    90% {
      transform: translate(1%, 1%);
    }
  }
`;

/** Static grain pattern for performance */
export const getStaticGrainCSS = (opacity: number): string => `
  .static-grain {
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    opacity: ${opacity};
  }
`;




