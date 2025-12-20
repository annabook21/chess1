/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SIERRA VGA PIXEL ART SYSTEM
 * Multi-color pixel art icons with authentic VGA-era aesthetics
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Key improvements over the original PixelIcon:
 * - Multi-color palette support (not just monochrome)
 * - Built-in shading with highlight/shadow colors
 * - VGA 256-color authentic palette
 * - Dithering pattern support
 * - Beveled 3D effect capability
 */

import React from 'react';
import './PixelArtSystem.css';

// ═══════════════════════════════════════════════════════════════════════════
// VGA COLOR PALETTE
// Authentic Quest for Glory / King's Quest era colors
// ═══════════════════════════════════════════════════════════════════════════

export const VGA_PALETTE = {
  // Transparent
  '_': 'transparent',
  
  // Blacks & Grays (stone)
  '0': '#000000', // Pure black
  '1': '#282828', // Dark gray
  '2': '#505050', // Medium dark gray
  '3': '#787878', // Medium gray
  '4': '#a0a0a0', // Light gray
  '5': '#c8c8c8', // Very light gray
  '6': '#f0f0f0', // Near white
  
  // Golds (for ornate elements)
  'g': '#604018', // Dark gold/brown
  'G': '#906830', // Medium gold
  'Y': '#c09048', // Gold
  'y': '#d4a828', // Bright gold
  'W': '#f0d048', // Light gold/yellow
  
  // Browns (wood)
  'b': '#402810', // Dark brown
  'B': '#604020', // Medium brown
  'n': '#805830', // Tan
  
  // Blues (for gems, magic)
  'd': '#101840', // Dark blue
  'D': '#203060', // Medium dark blue
  'u': '#3050a8', // Blue
  'U': '#5080d0', // Light blue
  'c': '#80b0f0', // Cyan/sky
  
  // Reds (for danger, fire)
  'r': '#401010', // Dark red
  'R': '#802020', // Medium red
  'x': '#a82020', // Red
  'X': '#d04040', // Bright red
  'p': '#f08080', // Pink/light red
  
  // Greens (nature)
  'e': '#104010', // Dark green
  'E': '#208020', // Medium green
  'a': '#30a040', // Green
  'A': '#60d060', // Light green
  
  // Purples (magic)
  'm': '#301040', // Dark purple
  'M': '#503080', // Medium purple
  'v': '#8050c0', // Purple
  'V': '#a080e0', // Light purple
  
  // Parchment/Paper
  'P': '#d4c4a8', // Parchment base
  'Q': '#e8dcc8', // Parchment light
  'q': '#b0a080', // Parchment dark
} as const;

type PaletteKey = keyof typeof VGA_PALETTE;

// ═══════════════════════════════════════════════════════════════════════════
// MULTI-COLOR ICON DEFINITIONS
// Each character represents a color from the VGA_PALETTE
// ═══════════════════════════════════════════════════════════════════════════

export const VGA_ICONS: Record<string, string> = {
  // Gold ornate sword with shading
  sword_gold: `
    ________________
    _____________W__
    ____________Wy__
    ___________WyG__
    __________WyGg__
    _________WyGg___
    ________WyGg____
    _______WyGg_____
    ______WyGg______
    _____WyGg_______
    ____1yGg________
    ___1BGg_________
    __1BgBn_________
    _1BgnB__________
    _1gn____________
    _1______________
  `,
  
  // Stone shield with metal rim
  shield_stone: `
    __4555555554____
    _45666666665____
    4566666666665___
    5666644466665___
    56664YYYY4665___
    5664YyyyyY465___
    566YyyyyyY665___
    566YyyyyyY665___
    _56YyyyyyY65____
    _564YyyyY465____
    __564YYY465_____
    ___5644465______
    ____56665_______
    _____555________
    ______4_________
    ________________
  `,
  
  // Glowing magic gem
  gem_magic: `
    ________________
    _____UUUU_______
    ____UccccU______
    ___UcUUUUcU_____
    __UcUuuuuUcU____
    _UcUuddddduUc___
    _UcuddDDDdduU___
    _UcudDddDduU____
    _UcudDddDduU____
    _UcuddDDDdduU___
    _UcUuddddduUc___
    __UcUuuuuUcU____
    ___UcUUUUcU_____
    ____UccccU______
    _____UUUU_______
    ________________
  `,
  
  // Flickering flame with warm colors
  flame_warm: `
    _______y________
    ______yW________
    _____yWy________
    _____yWy________
    ____yWWy________
    ____yWXy________
    ___yWXXy________
    ___yWXXRy_______
    __yWXXRRy_______
    __yWXRRRy_______
    __yXRRRRy_______
    __yRRrrRy_______
    ___yRrrRy_______
    ___yrrrry_______
    ____yyyy________
    ________________
  `,
  
  // Royal crown with jewels
  crown_royal: `
    ________________
    _y___y___y______
    _yW__yW__yW_____
    _yW__yW__yW_____
    yyWyyWyyWyy_____
    yWWWWWWWWWy_____
    yWuWyWuWyWy_____
    yWuWyWuWyWy_____
    GyyyyyyyyG______
    GWWWWWWWWWg_____
    GyyyyyyyyyGg____
    _GGGGGGGGGgg____
    _ggggggggggg____
    ________________
    ________________
    ________________
  `,
  
  // Ornate castle tower
  castle_tower: `
    ___4_4_4_4______
    ___535353_______
    __55555555______
    __53333335______
    __5333q335______
    __5333q335______
    __533qqq35______
    __533qqq35______
    __53qqqq35______
    __53qPPq35______
    __53PPPP35______
    __533PP335______
    __53333335______
    _553333355______
    5555555555______
    ________________
  `,
  
  // Ghostly spirit
  ghost_spirit: `
    ____5555________
    ___566665_______
    __56666665______
    _5666dd665______
    _566d00d65______
    _5666dd665______
    _5666666665_____
    _56666666665____
    56666666666665__
    56655665566565__
    _5_5__5__5_5_5__
    ________________
    ________________
    ________________
    ________________
    ________________
  `,
  
  // Glowing orb
  orb_glow: `
    ________________
    ____VvvV________
    ___VvMMMvV______
    __VvMMmMmVV_____
    _VvMMmmmMmV_____
    _VMMmmmmMmV_____
    VvMmmmmmmmV_____
    VMMmmmmmmV______
    VvMmmmmmMV______
    _VMMmmmMmV______
    _VvMMmMMmV______
    __VvMMMMV_______
    ___VvvvV________
    ____VV__________
    ________________
    ________________
  `,
  
  // Scroll/parchment
  scroll_open: `
    ________________
    _55PP555________
    5PPPPPPPP5______
    PPPPqqqqPP5_____
    PPqqqqqqPPP_____
    PqqqqqqqqPP_____
    PqqqqqqqqPP_____
    Pqq1111qqPP_____
    Pqq____qqPP_____
    Pqq1111qqPP_____
    PqqqqqqqqPP_____
    PqqqqqqqqPP_____
    PPqqqqqqPP______
    PPPPqqqqP_______
    _5PPPPPP5_______
    __5555__________
  `,
  
  // Warning/danger triangle
  warning_sign: `
    ________________
    ______yy________
    _____yWWy_______
    _____yWWy_______
    ____yWWWWy______
    ____yW11Wy______
    ___yWW11WWy_____
    ___yWW11WWy_____
    __yWWW11WWWy____
    __yWWW11WWWy____
    _yWWWW11WWWWy___
    _yWWWW__WWWWy___
    yWWWWW11WWWWWy__
    yWWWWWWWWWWWWy__
    gggggggggggggg__
    ________________
  `,
  
  // Checkmark/success
  check_gold: `
    ________________
    ________________
    _____________y__
    ____________Yy__
    ___________Yy___
    __________Yy____
    _________Yy_____
    ________Yy______
    __y____Yy_______
    __Yy__Yy________
    ___YyYy_________
    ____Yy__________
    _____y__________
    ________________
    ________________
    ________________
  `,
  
  // X mark / cross
  cross_red: `
    ________________
    ________________
    __x__________x__
    __Xx________xX__
    ___Xx______xX___
    ____Xx____xX____
    _____Xx__xX_____
    ______XxxX______
    ______XxxX______
    _____Xx__xX_____
    ____Xx____xX____
    ___Xx______xX___
    __Xx________xX__
    __x__________x__
    ________________
    ________________
  `,
  
  // Target/bullseye
  target_aim: `
    ________________
    ____RRRRRR______
    __RRxxxxxxRR____
    _RxxxxRRxxxxR___
    RxxxRRrrRRxxxR__
    RxxRrrrrrrRxxR__
    RxRrrr55rrrRxR__
    RxRrr5WW5rrRxR__
    RxRrr5WW5rrRxR__
    RxRrrr55rrrRxR__
    RxxRrrrrrrRxxR__
    RxxxRRrrRRxxxR__
    _RxxxxRRxxxxR___
    __RRxxxxxxRR____
    ____RRRRRR______
    ________________
  `,
  
  // Star/sparkle
  star_gold: `
    _______y________
    _______y________
    ______YYY_______
    _______y________
    ___y__yYy__y____
    ____yYYYYYy_____
    __yYYYYYYYYYy___
    YYYYYYYYYYYYYYY_
    __yYYYYYYYYYy___
    ____yYYYYYy_____
    ___y__yYy__y____
    _______y________
    ______YYY_______
    _______y________
    _______y________
    ________________
  `,
};

// ═══════════════════════════════════════════════════════════════════════════
// PIXEL ART RENDERER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface VGAPixelIconProps {
  name: keyof typeof VGA_ICONS;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

function parseVGAIcon(data: string): (string | null)[][] {
  const lines = data.trim().split('\n').map(line => line.trim());
  const grid: (string | null)[][] = [];
  
  for (let y = 0; y < 16; y++) {
    grid[y] = [];
    const line = lines[y] || '';
    for (let x = 0; x < 16; x++) {
      const char = line[x] || '_';
      grid[y][x] = char === '_' ? null : VGA_PALETTE[char as PaletteKey] || null;
    }
  }
  
  return grid;
}

export const VGAPixelIcon: React.FC<VGAPixelIconProps> = ({
  name,
  size = 32,
  className = '',
  style = {},
}) => {
  const iconData = VGA_ICONS[name];
  if (!iconData) {
    console.warn(`VGAPixelIcon: Unknown icon "${name}"`);
    return null;
  }

  const grid = parseVGAIcon(iconData);
  
  return (
    <svg
      className={`vga-pixel-icon vga-pixel-icon--${name} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        imageRendering: 'pixelated',
        ...style,
      }}
    >
      {grid.map((row, y) =>
        row.map((color, x) =>
          color ? (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={color}
            />
          ) : null
        )
      )}
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// CSS BOX-SHADOW BASED PIXEL ART (for larger decorative elements)
// This technique creates pixel art using CSS only, no images needed
// ═══════════════════════════════════════════════════════════════════════════

interface CSSPixelArtProps {
  pixels: string; // Grid like VGA_ICONS format
  pixelSize?: number;
  className?: string;
}

export const CSSPixelArt: React.FC<CSSPixelArtProps> = ({
  pixels,
  pixelSize = 4,
  className = '',
}) => {
  const grid = parseVGAIcon(pixels);
  
  // Generate box-shadow string
  const shadows: string[] = [];
  
  grid.forEach((row, y) => {
    row.forEach((color, x) => {
      if (color) {
        shadows.push(`${x * pixelSize}px ${y * pixelSize}px 0 ${color}`);
      }
    });
  });
  
  return (
    <div
      className={`css-pixel-art ${className}`}
      style={{
        width: pixelSize,
        height: pixelSize,
        boxShadow: shadows.join(', '),
        imageRendering: 'pixelated',
      }}
    />
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// DECORATIVE FRAME CORNERS (Sierra-style ornate corners)
// ═══════════════════════════════════════════════════════════════════════════

const CORNER_ORNATE = `
  ggggg___________
  gYYYgg__________
  gYWWYg__________
  gYWWYg__________
  gYYYYgg_________
  gggggggg________
  __ggggggg_______
  ___ggggggg______
  ____ggggggg_____
  _____ggggggg____
  ______ggggggg___
  _______ggggggg__
  ________ggggggg_
  _________gggggg_
  __________ggggg_
  ___________gggg_
`;

export const OrnateCorner: React.FC<{
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size?: number;
}> = ({ position, size = 32 }) => {
  const transforms: Record<string, string> = {
    'top-left': 'none',
    'top-right': 'scaleX(-1)',
    'bottom-left': 'scaleY(-1)',
    'bottom-right': 'scale(-1, -1)',
  };
  
  return (
    <div style={{ transform: transforms[position] }}>
      <VGAPixelIcon name="castle_tower" size={size} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY: Convert image to pixel art palette
// ═══════════════════════════════════════════════════════════════════════════

export function generatePixelArtFromGrid(
  grid: number[][],
  palette: string[]
): string {
  return grid
    .map(row => row.map(idx => palette[idx] || '_').join(''))
    .join('\n');
}

export default VGAPixelIcon;


