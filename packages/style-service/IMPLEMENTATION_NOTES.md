# Implementation Notes - Matching AWS Demo

This implementation closely follows the [AWS Embodied Chess Demo](https://github.com/aws-samples/embodied-chess-demo-with-amazon-bedrock) pattern.

## Key Features Implemented

### 1. Tool Use (Function Calling)
- Uses Bedrock's tool/function calling feature for structured responses
- Tool schema matches AWS demo exactly:
  - `next_move`: SAN notation string
  - `justification`: Explanation string
- Falls back to text parsing if model doesn't support tools

### 2. System Prompts
- Master personality embedded in system prompt
- Base instruction: "You are a chess player who's goal is to win the game..."
- Each master has unique style description

### 3. Retry Logic (3 Attempts)
- **Attempt 0**: Full prompt with FEN position
- **Attempt 1**: Error correction (move was invalid)
- **Attempt 2**: Legal moves list provided (ensures valid move)

### 4. Message History
- Maintains conversation context across retries
- Adds formatted responses to history for continuity

### 5. Validation
- Uses `chess.js` to validate SAN moves (equivalent of Python's `board.push_san()`)
- Converts SAN back to UCI for our system
- Only returns moves that pass validation

## Differences from Python Implementation

1. **API**: Uses `InvokeModelCommand` (TypeScript) vs `converse()` (Python)
   - Structure is equivalent, just different API surface
   
2. **Type Safety**: TypeScript provides compile-time checks

3. **Error Handling**: TypeScript try/catch vs Python exception handling

## Testing

To test tool use:
- Use Claude 3 Sonnet or newer (supports tool use)
- Older models will fall back to text parsing automatically

## References

- AWS Demo: `packages/infra/lib/NestedStacks/StepFunction/lambdas/moveFunctions/bedrock/models/anthropic.py`
- Our Implementation: `packages/style-service/src/clients/bedrock-client.ts`

