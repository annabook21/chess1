import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { Chess } from 'chess.js';
import { MasterStyle } from '@master-academy/contracts';
import { MoveResult } from './index';
import { parseAnthropicToolUse, parseMoveFromText } from './parsers';

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const modelId = process.env.BEDROCK_MODEL_ID_ANTHROPIC || 'anthropic.claude-sonnet-4-20250514';

const STYLE_PROMPTS: Record<MasterStyle, string> = {
  capablanca: 'You play like José Raúl Capablanca - emphasize simplicity, endgame technique, and positional clarity.',
  tal: 'You play like Mikhail Tal - favor sharp tactical complications, sacrifices, and aggressive attacks.',
  karpov: 'You play like Anatoly Karpov - employ positional squeezes, prophylaxis, and strategic maneuvering.',
  fischer: 'You play like Bobby Fischer - combine deep preparation, precise calculation, and fighting spirit.',
};

export async function anthropicPredict(fen: string, styleId: MasterStyle): Promise<MoveResult> {
  const board = new Chess(fen);
  const legalMoves = board.moves();
  const stylePrompt = STYLE_PROMPTS[styleId] || STYLE_PROMPTS.fischer;

  const systemPrompt = `You are a chess master. ${stylePrompt} Your goal is to win the game.`;

  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 512,
    temperature: 0.7,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Given the FEN position '${fen}', provide the best move in Standard Algebraic Notation (SAN).

Legal moves: ${legalMoves.join(', ')}

Format your response exactly like this:
MOVE: [SAN notation]
JUSTIFICATION: [Your explanation in 1-2 sentences]`,
          },
        ],
      },
    ],
    tools: [
      {
        name: 'chess_move',
        description: 'Provide the next chess move in SAN notation with justification.',
        input_schema: {
          type: 'object',
          properties: {
            next_move: { type: 'string', description: 'The move in SAN notation' },
            justification: { type: 'string', description: 'Brief explanation' },
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
  const toolResult = parseAnthropicToolUse(responseBody);
  if (toolResult.move) {
    return toolResult;
  }

  // Fallback to text parsing
  const textContent = responseBody.content?.[0]?.text || '';
  return parseMoveFromText(textContent);
}

