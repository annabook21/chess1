import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { Chess } from 'chess.js';
import { MasterStyle } from '@master-academy/contracts';
import { MoveResult } from './index';
import { parseMoveFromText } from './parsers';

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const modelId = process.env.BEDROCK_MODEL_ID_AMAZON || 'amazon.titan-text-express-v1';

const STYLE_PROMPTS: Record<MasterStyle, string> = {
  capablanca: 'Play like Capablanca - simple, clear, endgame-focused.',
  tal: 'Play like Tal - tactical, sacrificial, aggressive.',
  karpov: 'Play like Karpov - positional, prophylactic, squeezing.',
  fischer: 'Play like Fischer - precise, prepared, fighting.',
  'human-like': 'Play like a typical human - make natural, intuitive moves.',
};

export async function amazonPredict(fen: string, styleId: MasterStyle): Promise<MoveResult> {
  const board = new Chess(fen);
  const legalMoves = board.moves();
  const stylePrompt = STYLE_PROMPTS[styleId] || STYLE_PROMPTS.fischer;

  const prompt = `You are a chess master. ${stylePrompt}

Given the FEN position '${fen}', provide the best move.

Legal moves: ${legalMoves.join(', ')}

Format your response exactly like this:
MOVE: [SAN notation]
JUSTIFICATION: [Your explanation in 1-2 sentences]`;

  const body = JSON.stringify({
    inputText: prompt,
    textGenerationConfig: {
      maxTokenCount: 256,
      temperature: 0.7,
      topP: 0.9,
    },
  });

  const response = await client.send(new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body,
  }));

  const responseBody = JSON.parse(Buffer.from(response.body as Uint8Array).toString('utf-8'));
  const text = responseBody.results?.[0]?.outputText || '';

  const result = parseMoveFromText(text);

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

