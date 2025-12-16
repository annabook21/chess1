# Cursed Castle Spirit Theme

A Quest for Glory-inspired pixel-art theme for the chess trainer, featuring a Cursed Castle Spirit narrator and retro adventure game UI.

## Architecture Overview

```
packages/
├── frontend-web/src/
│   ├── theme/                    # Theme system
│   │   ├── theme.ts              # Core types (Theme, Palette, Effects)
│   │   ├── ThemeProvider.tsx     # React context provider
│   │   ├── themes/
│   │   │   └── cursedCastleSpirit.ts  # Castle theme config
│   │   └── effects/              # Visual effects
│   │       ├── pixelScale.ts     # Pixel-perfect rendering
│   │       ├── dither.ts         # Ordered dithering
│   │       ├── vignette.ts       # Candle vignette
│   │       └── grain.ts          # Film grain
│   │
│   ├── narration/                # Narration engine
│   │   ├── types.ts              # Core types
│   │   ├── tagger.ts             # Move analysis → tags
│   │   ├── templateLoader.ts     # Load template packs
│   │   ├── narrator.ts           # Render narration
│   │   ├── render/
│   │   │   └── typewriter.ts     # Typewriter effect
│   │   └── packs/
│   │       └── castle_spirit/    # Template pack
│   │           └── {TAG}/v{N}.md # Template variants
│   │
│   └── ui/castle/                # Castle UI components
│       ├── SpiritWhisper.tsx     # Narration dialog
│       ├── HeroSheet.tsx         # Player stats
│       └── RitualBar.tsx         # Action toggles
│
└── contracts/src/
    ├── achievements/             # Achievement system
    │   ├── schema.ts             # Types
    │   └── castleAchievements.ts # 12 themed achievements
    └── castle/
        ├── rooms.json            # Room curriculum data
        └── index.ts              # Room helpers
```

## Adding New Narration Tags

### 1. Add the tag to types.ts

```typescript
// packages/frontend-web/src/narration/types.ts
export type NarrationTag =
  // ... existing tags
  | 'YOUR_NEW_TAG';
```

### 2. Add detection logic to tagger.ts

```typescript
// packages/frontend-web/src/narration/tagger.ts
export const getPrimaryTag = (input: TaggerInput, delta: number): NarrationTag => {
  // Add your detection logic
  if (yourCondition) return 'YOUR_NEW_TAG';
  // ...
};
```

### 3. Create template files

Create a folder and at least 2-4 variants:

```
narration/packs/castle_spirit/YOUR_NEW_TAG/
├── v1.md
├── v2.md
├── v3.md
└── v4.md
```

Each file contains the narrator text with placeholders:

```markdown
*The spirit {emotion}*

Your {piece} upon {square} has {description}. 
The evaluation shifts by {evalDelta} centipawns.
```

### Available Placeholders

| Placeholder | Description |
|-------------|-------------|
| `{piece}` | Piece name (knight, bishop, etc.) |
| `{square}` | Target square (e4, f3, etc.) |
| `{fromSquare}` | Origin square |
| `{toSquare}` | Destination square |
| `{evalDelta}` | Eval change (absolute) |
| `{concept}` | First concept tag |
| `{pieceValue}` | Material value |
| `{moveNumber}` | Current move number |

## Adding New Achievements

### 1. Define the trigger type if needed

```typescript
// packages/contracts/src/achievements/schema.ts
export type AchievementTrigger =
  // ... existing triggers
  | { type: 'your_trigger'; yourParam: number };
```

### 2. Add the achievement

```typescript
// packages/contracts/src/achievements/castleAchievements.ts
{
  id: 'your-achievement-id',
  name: 'The Achievement Name',
  flavorText: 'Atmospheric description...',
  description: 'Clear unlock condition.',
  trigger: { type: 'your_trigger', yourParam: 10 },
  rarity: 'rare',
  iconKey: '🏆',
  xpReward: 200,
  roomUnlock: 'optional-room-id',
}
```

## Adding New Castle Rooms

Edit `packages/contracts/src/castle/rooms.json`:

```json
{
  "id": "your-room",
  "name": "The Your Room",
  "description": "What players learn here.",
  "icon": "🏯",
  "focusTags": ["tag1", "tag2"],
  "unlockRequirements": {
    "type": "achievement",
    "achievementId": "required-achievement"
  },
  "order": 7
}
```

## Adding New Themes

1. Create `themes/yourTheme.ts` implementing the `Theme` interface
2. Register in `ThemeProvider.tsx`:

```typescript
const THEMES: Record<string, Theme> = {
  'cursed-castle-spirit': cursedCastleSpirit,
  'your-theme-id': yourTheme,
};
```

## Visual Effects

Toggle effects in theme config:

```typescript
effects: {
  pixelScale: true,      // Crisp pixel rendering
  pixelScaleFactor: 2,
  dither: true,          // Ordered dithering overlay
  ditherOpacity: 0.08,
  vignette: true,        // Dark edge vignette
  vignetteIntensity: 0.4,
  grain: true,           // Film grain
  grainOpacity: 0.05,
}
```

## Tone Slider

The narrator supports three tones:
- `whimsical` - Light, playful
- `gothic` - Dark, atmospheric (default)
- `ruthless` - Harsh, unforgiving

Currently affects template selection priority (future: separate template variants per tone).

## Testing

Run tests:
```bash
cd packages/frontend-web
pnpm test
```

Key test files:
- `narration/tagger.test.ts` - Tag derivation
- `narration/narrator.test.ts` - Template interpolation

## Design Principles

1. **Modularity**: Each file < 300 LOC, single responsibility
2. **Data-Driven**: Templates and achievements in config, not code
3. **Deterministic**: Same input → same output (seeded randomness)
4. **Graceful Degradation**: Missing templates → fallback text
5. **No Copyrighted Assets**: All content is original

---

## Phase 3 Additions

### Board Frame (War Table Aesthetic)

The `BoardFrame` component wraps the chessboard in a medieval castle war table style:

```tsx
import { BoardFrame } from './components/BoardFrame';

<BoardFrame variant="stone" showTorches={true}>
  <ChessBoard ... />
</BoardFrame>
```

Variants: `stone` | `brass` | `wood`

### Keyboard Shortcuts

Sierra games had keyboard shortcuts - use `useKeyboardShortcuts`:

```tsx
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

useKeyboardShortcuts({
  observe: () => toggleThreats(),      // O
  foresee: () => togglePV(),           // F
  intuit: () => togglePrediction(),    // I
  openMap: () => setShowMap(true),     // M
  selectChoice1: () => selectMove(0),  // 1
  confirmMove: () => submitMove(),     // Enter
});
```

### Ritual Bar (Sierra Verb Style)

Enhanced with verb names and shortcuts:

```tsx
import { RitualBar, DEFAULT_RITUALS } from './ui/castle';

<RitualBar
  buttons={DEFAULT_RITUALS}
  onButtonClick={handleRitual}
  showShortcuts={true}
/>
```

### Game End Screens

Sierra-style dramatic endings:

```tsx
import { GameOverScreen, VictoryScreen, DrawScreen } from './ui/castle';

// On checkmate (loss)
<GameOverScreen
  xpEarned={150}
  movesPlayed={42}
  accuracy={68}
  onTryAgain={startNewGame}
  onReturnToMap={openCastleMap}
/>

// On victory
<VictoryScreen ... bestMoveDescription="Rxh7+! Brilliant sacrifice" />

// On draw
<DrawScreen ... />
```

### Mood Mapper

Connect narration tags to Spirit moods:

```tsx
import { tagToMood, taggerOutputToMood } from './narration/moodMapper';

const mood = tagToMood('FOUND_BRILLIANT_MOVE'); // 'impressed'
const mood2 = taggerOutputToMood(taggerOutput); // Based on severity + tag
```

### Room-Specific Narration Packs

Each castle room has unique narration tone:

```
narration/packs/
├── castle_spirit/    # Default (gothic)
├── courtyard/        # Beginner-friendly, encouraging
├── armory/           # Martial, tactical language
├── library/          # Scholarly (future)
├── crypt/            # Dark, punishing (future)
└── throne_room/      # Grand, climactic (future)
```

To add a room pack:
1. Create folder: `narration/packs/{room_id}/`
2. Add core tags: `FOUND_BEST_MOVE/`, `BLUNDER_HANGS_PIECE/`, etc.
3. Add variants: `v1.md`, `v2.md`
4. Tone defaults cascade: room → castle_spirit → hardcoded

### Audio Hooks (Placeholder)

Audio system ready for real sounds:

```tsx
import { useAudio, useTypewriterAudio } from './audio';

const { playSound } = useAudio();
playSound('achievement_unlock');

// For typewriter effect
const { onCharacter } = useTypewriterAudio();
```

Sound effects: `typewriter_char`, `move_submit`, `blunder`, `brilliant`, `achievement_unlock`, `victory`, etc.

### Testing

New test file:
- `narration/moodMapper.test.ts` - Mood mapping logic

Run with:
```bash
cd packages/frontend-web
pnpm exec vitest run
```


