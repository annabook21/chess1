# Bedrock Integration - AI-Powered Chess

This application uses **Amazon Bedrock** to generate chess moves dynamically, making each game unique and inspired.

## Architecture Change

### Before (Deterministic)
- Rule-based style evaluators
- Same moves every time
- Predictable gameplay

### After (AI-Powered) - Matching AWS Demo Pattern
- **Bedrock generates moves** using structured prompts (matching [AWS embodied-chess-demo](https://github.com/aws-samples/embodied-chess-demo-with-amazon-bedrock))
- **Retry logic**: Up to 3 attempts with progressive prompts
- **SAN notation**: Uses Standard Algebraic Notation (e.g., "e4", "Nf3") like the AWS demo
- **Message history**: Maintains conversation context across retries
- **Engine validates**: Converts SAN to UCI and validates legality
- **Every game is different** - dynamic, creative gameplay

## How It Works

### Style Service → Bedrock

1. **Position Analysis**: Current FEN position + legal moves
2. **Master Prompt**: Detailed personality prompt for each master:
   - Capablanca: Positional, endgame-focused
   - Tal: Tactical, attacking
   - Karpov: Strategic, methodical
   - Fischer: Precise, principled
3. **Bedrock Generation**: Claude 3 Sonnet generates moves in that style
4. **Engine Validation**: Only legal moves are returned

### Master Prompts (Matching AWS Demo Pattern)

Each master has a detailed prompt that includes:
- Their playing philosophy
- Known books/writings
- Characteristic strategies
- Tactical vs positional preferences

**Structured Response Format** (matching AWS demo):
```
MOVE: [SAN notation]
JUSTIFICATION: [Your explanation in 1-2 sentences]
```

**Progressive Retry Logic** (3 attempts):
1. **First attempt**: Full master personality + position analysis
2. **Second attempt**: Error correction prompt (move was invalid)
3. **Third attempt**: Legal moves list provided (ensures valid move)

Example (Tal):
```
You are Mikhail Tal, the "Magician from Riga" and tactical genius. Your style is:
- Aggressive, attacking play with sacrifices
- Creating complications and tactical opportunities
- Initiative and dynamic play over material
- Psychological pressure through threats
...
```

### Temperature Settings

- **Style Service**: `temperature: 0.7` - Creative, varied moves
- **Coach Service**: `temperature: 0.3` - Deterministic explanations

## References

Implementation closely follows the [AWS Embodied Chess Demo](https://github.com/aws-samples/embodied-chess-demo-with-amazon-bedrock):
- Uses same retry logic pattern (3 attempts)
- Uses SAN notation like their Python implementation
- Uses structured "MOVE: ... JUSTIFICATION: ..." response format
- Maintains message history for conversation context
- Progressive prompts (full → error correction → legal moves list)

## Benefits

1. **Dynamic Gameplay**: Every game feels different
2. **Master Personalities**: Each master plays in their characteristic style
3. **Creative Moves**: Bedrock can find unexpected but valid moves
4. **Educational**: Players learn from varied, master-style play

## Setup

See [SETUP.md](./SETUP.md) for AWS credentials configuration.

## Model Selection

Default: `anthropic.claude-v3-sonnet-20240229-v1:0`

You can use other Claude models:
- `anthropic.claude-v3-5-sonnet-20241022-v2:0` (newest, most capable)
- `anthropic.claude-v3-opus-20240229-v1:0` (most powerful)
- `anthropic.claude-v3-haiku-20240307-v1:0` (fastest, cheapest)

Set via `BEDROCK_MODEL_ID` environment variable.

