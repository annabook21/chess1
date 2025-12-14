import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { Chess } from 'chess.js';
import { MasterStyle } from '@master-academy/contracts';
import { MoveResult } from './index';
import { parseAnthropicToolUse, parseMoveFromText } from './parsers';
import { MASTER_PROFILES, getPositionAwarePrompt } from './master-profiles';

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const modelId = process.env.BEDROCK_MODEL_ID_ANTHROPIC || 'anthropic.claude-3-5-sonnet-20241022-v2:0';

export async function anthropicPredict(fen: string, styleId: MasterStyle): Promise<MoveResult> {
  const board = new Chess(fen);
  const legalMoves = board.moves();
  const profile = MASTER_PROFILES[styleId];
  
  // Get position-aware system prompt with full master personality
  const systemPrompt = getPositionAwarePrompt(fen, styleId, legalMoves);

  // Build a prompt that elicits master-style thinking
  const userPrompt = `Position (FEN): ${fen}

Legal moves available: ${legalMoves.join(', ')}

As ${profile.fullName} (${profile.nickname}), analyze this position and choose your move.

Think about:
- ${profile.prioritizes.slice(0, 3).join('\n- ')}

Avoid:
- ${profile.avoids.slice(0, 2).join('\n- ')}

Provide your move and explain your thinking in your characteristic style.`;

  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 600,
    temperature: 0.7,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: userPrompt,
          },
        ],
      },
    ],
    tools: [
      {
        name: 'chess_move',
        description: 'Provide the next chess move with master-style reasoning.',
        input_schema: {
          type: 'object',
          properties: {
            next_move: { 
              type: 'string', 
              description: 'The move in Standard Algebraic Notation (SAN), e.g., "e4", "Nf3", "O-O"' 
            },
            justification: { 
              type: 'string', 
              description: 'Your inner monologue explaining the move in your characteristic style (2-3 sentences)' 
            },
            threats: {
              type: 'string',
              description: 'What threats or plans does this move create? (1 sentence)'
            },
          },
          required: ['next_move', 'justification'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'chess_move' },
  });

  const response = await client.send(new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body,
  }));

  const responseBody = JSON.parse(Buffer.from(response.body as Uint8Array).toString('utf-8'));

  // Try tool use first
  let result = parseAnthropicToolUse(responseBody);
  if (!result.move) {
    // Fallback to text parsing
    const textContent = responseBody.content?.[0]?.text || '';
    result = parseMoveFromText(textContent);
  }

  // Convert SAN to UCI
  if (result.move) {
    const uciMove = sanToUci(board, result.move);
    if (uciMove) {
      return { move: uciMove, justification: result.justification };
    }
  }

  return { move: '', justification: '' };
}

/**
 * Convert SAN notation to UCI notation
 */
function sanToUci(board: Chess, san: string): string | null {
  try {
    // Clone the board to test the move
    const testBoard = new Chess(board.fen());
    const move = testBoard.move(san);
    if (move) {
      return `${move.from}${move.to}${move.promotion || ''}`;
    }
  } catch {
    // Invalid SAN
  }
  return null;
}

