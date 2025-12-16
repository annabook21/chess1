/**
 * Style Response Schema
 * Strict JSON output format for Bedrock style predictions
 */

export interface StyleResponse {
  movesUci: string[]; // 3-5 UCI moves like ["e2e4", "g1f3", "d2d4"]
  planOneLiner: string; // Master's one-line plan
  threatSummary: string; // What threats/plans this creates
}

/**
 * Parse and validate style response JSON
 * Returns empty response on failure (caller handles fallback)
 */
export function parseStyleResponse(raw: string): StyleResponse {
  const empty: StyleResponse = { movesUci: [], planOneLiner: '', threatSummary: '' };
  
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = raw.trim();
    
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```')) {
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        jsonStr = match[1].trim();
      }
    }
    
    const parsed = JSON.parse(jsonStr);
    
    // Validate structure
    if (!Array.isArray(parsed.movesUci)) {
      console.warn('StyleResponse: movesUci is not an array');
      return empty;
    }
    
    // Filter to valid UCI format (4-5 chars, a-h1-8)
    const validMoves = parsed.movesUci.filter((m: unknown) => {
      if (typeof m !== 'string') return false;
      // Basic UCI validation: e2e4, g1f3, e7e8q
      return /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m);
    });
    
    return {
      movesUci: validMoves.slice(0, 5), // Max 5 moves
      planOneLiner: typeof parsed.planOneLiner === 'string' ? parsed.planOneLiner : '',
      threatSummary: typeof parsed.threatSummary === 'string' ? parsed.threatSummary : '',
    };
  } catch (error) {
    console.warn('StyleResponse: Failed to parse JSON:', error);
    return empty;
  }
}





