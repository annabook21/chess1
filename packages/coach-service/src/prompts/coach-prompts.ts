/**
 * Coach Prompts
 * 
 * Templated prompts for Bedrock to generate explanations
 */

import { ExplainChoiceRequest } from '@master-academy/contracts';

export function buildCoachPrompt(request: ExplainChoiceRequest): string {
  const { chosenMove, bestMove, pv = [], conceptTag, userSkill = 1200 } = request;

  const skillLevel = userSkill < 1200 ? 'beginner' : userSkill < 1600 ? 'intermediate' : 'advanced';
  const continuation = pv.length > 0 ? pv.slice(0, 3).join(' → ') : chosenMove;

  const prompt = `You are a chess coach explaining a move to a ${skillLevel} player (ELO ~${userSkill}).

Position context:
- Player chose move: ${chosenMove}
- Engine's best move: ${bestMove}
- Continuation: ${continuation}

Concept: ${conceptTag}

Provide a SHORT explanation (2-3 sentences max) that:
1. Explains what the move accomplishes
2. Mentions the key concept (${conceptTag})
3. Is appropriate for a ${skillLevel} player

Keep it concise and educational. Do not invent moves or evaluations - only explain what was provided.

Explanation:`;

  return prompt;
}

export function refineConceptTags(
  conceptTag: string,
  evalDelta: number = 0,
  pv: string[] = []
): string[] {
  const tags: string[] = [conceptTag];

  // Add additional tags based on context
  if (evalDelta > 100) {
    tags.push('good_move');
  } else if (evalDelta < -200) {
    tags.push('blunder');
  }

  // Infer tags from PV length (longer = more strategic)
  if (pv && pv.length > 3) {
    tags.push('long_term_plan');
  }

  return tags;
}

