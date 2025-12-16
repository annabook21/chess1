/**
 * Anthropic Bedrock Model - Optimized
 * ONE call returns 3-5 UCI moves (not 1 per call)
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { Chess } from 'chess.js';
import { MasterStyle } from '@master-academy/contracts';
import { StyleResponse, parseStyleResponse } from '../schemas/styleResponse';
import { MASTER_PROFILES } from './master-profiles';

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-west-2' });
const modelId = process.env.BEDROCK_MODEL_ID_ANTHROPIC || 'anthropic.claude-sonnet-4-5-20250929-v1:0';

export interface MultiMoveResult {
  moves: string[]; // UCI format
  planOneLiner: string;
  threatSummary: string;
  justification: string;
}

/**
 * Get 3-5 style-appropriate moves in ONE Bedrock call
 */
export async function anthropicPredictMultiple(
  fen: string, 
  styleId: MasterStyle,
  legalMovesUci: string[] // Pre-computed by caller
): Promise<MultiMoveResult> {
  const profile = MASTER_PROFILES[styleId];
  const board = new Chess(fen);
  const legalMovesSan = board.moves();
  
  // Compact prompt - no full legalMoves list to reduce tokens
  const systemPrompt = `You are ${profile.fullName} (${profile.nickname}). 
Style: ${profile.styleDescription}
Priorities: ${profile.prioritizes.slice(0, 2).join(', ')}

OUTPUT STRICT JSON ONLY - no text outside JSON:
{
  "movesUci": ["e2e4", "d2d4", "g1f3"],
  "planOneLiner": "...",
  "threatSummary": "..."
}

Rules:
- Return 3-5 UCI moves (e2e4 format, NOT e4)
- Moves must be from legal options
- Best move first, alternatives after
- No explanation outside JSON`;

  const userPrompt = `FEN: ${fen}

Legal moves (SAN): ${legalMovesSan.slice(0, 20).join(', ')}${legalMovesSan.length > 20 ? '...' : ''}

Pick 3-5 moves in ${profile.nickname} style. JSON only.`;

  try {
    const body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 300, // Reduced - just need JSON
      temperature: 0.5,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const response = await client.send(new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body,
    }));

    const responseBody = JSON.parse(Buffer.from(response.body as Uint8Array).toString('utf-8'));
    const textContent = responseBody.content?.[0]?.text || '';
    
    // Parse the JSON response
    const parsed = parseStyleResponse(textContent);
    
    // Filter to only legal moves
    const legalSet = new Set(legalMovesUci);
    const validMoves = parsed.movesUci.filter(m => legalSet.has(m));
    
    // If we got moves, try to convert any SAN moves that slipped through
    if (validMoves.length === 0 && parsed.movesUci.length > 0) {
      // Try converting SAN to UCI
      for (const m of parsed.movesUci) {
        const uci = sanToUci(board, m);
        if (uci && legalSet.has(uci)) {
          validMoves.push(uci);
        }
      }
    }

    return {
      moves: validMoves,
      planOneLiner: parsed.planOneLiner || `${profile.nickname}'s choice`,
      threatSummary: parsed.threatSummary || '',
      justification: parsed.planOneLiner,
    };
  } catch (error) {
    console.error(`Anthropic prediction failed for ${styleId}:`, error);
    return { moves: [], planOneLiner: '', threatSummary: '', justification: '' };
  }
}

/**
 * Convert SAN to UCI (fallback for bad model output)
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

// Keep old function for backwards compatibility but mark deprecated
/** @deprecated Use anthropicPredictMultiple instead */
export async function anthropicPredict(fen: string, styleId: MasterStyle) {
  const board = new Chess(fen);
  const legalMoves = board.moves({ verbose: true }).map(m => `${m.from}${m.to}${m.promotion || ''}`);
  const result = await anthropicPredictMultiple(fen, styleId, legalMoves);
  return { 
    move: result.moves[0] || '', 
    justification: result.justification 
  };
}
