# Style Service - Bedrock-Powered Master Moves

This service uses **Amazon Bedrock** to generate chess moves in the style of 4 chess masters, following the pattern from the [AWS Embodied Chess Demo](https://github.com/aws-samples/embodied-chess-demo-with-amazon-bedrock).

Masters:
- **Capablanca** - Positional, endgame-focused
- **Tal** - Tactical, attacking
- **Karpov** - Strategic, methodical  
- **Fischer** - Precise, principled

## How It Works

1. **Tool Use (Function Calling)** - Uses Bedrock's tool/function calling for structured responses (matching AWS demo)
   - Tool schema: `next_move` (SAN) + `justification` (explanation)
   - Falls back to text parsing if model doesn't support tools
2. **System Prompts** - Master personality embedded in system prompt
3. **Retry Logic** - Up to 3 attempts with progressive prompts:
   - Attempt 1: Full master personality + FEN position
   - Attempt 2: Error correction (move was invalid)
   - Attempt 3: Legal moves list provided (ensures valid move)
4. **Uses SAN notation** (Standard Algebraic Notation) like "e4", "Nf3" - matches AWS demo
5. **Message history** maintained for conversation context across retries
6. **Engine validates** - Uses `chess.js` to validate SAN moves, converts to UCI
7. **Temperature = 0.7** for creative, varied moves (not deterministic)
8. **Fallback** - If all 3 attempts fail, returns random legal move

## Setup

### Required Environment Variables

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
BEDROCK_MODEL_ID=anthropic.claude-v3-sonnet-20240229-v1:0  # Optional, defaults to Claude 3 Sonnet
```

### Without AWS Credentials

The service will use a mock that returns random legal moves. **This is not recommended** - the whole point is AI-powered, dynamic gameplay.

## Architecture

- **Bedrock drives creativity**: Each master gets a detailed personality prompt
- **Engine validates**: Only legal moves are returned
- **No deterministic rules**: Every game feels different because Bedrock generates moves dynamically

## Master Prompts

Each master has a detailed prompt that includes:
- Their playing philosophy
- Known books/writings
- Characteristic strategies
- Tactical vs positional preferences

The prompts are designed to make Bedrock "think" like each master when generating moves.

## References

Inspired by the [AWS Embodied Chess Demo](https://github.com/aws-samples/embodied-chess-demo-with-amazon-bedrock) which uses Bedrock for chess gameplay.

