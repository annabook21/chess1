/**
 * Coach Service API Routes
 */

import { Router, Request, Response } from 'express';
import { ExplainChoiceRequest, ExplainChoiceResponse } from '@master-academy/contracts';
import { buildCoachPrompt, refineConceptTags } from '../prompts/coach-prompts';
import { BedrockClient } from '../clients/bedrock-client';

const router = Router();
const bedrockClient = new BedrockClient();

/**
 * POST /coach/explain
 * Generate coaching explanation for a move choice
 */
router.post('/explain', async (req: Request, res: Response) => {
  try {
    const request: ExplainChoiceRequest = req.body;

    if (!request.fen || !request.chosenMove || !request.bestMove) {
      return res.status(400).json({ error: 'fen, chosenMove, and bestMove are required' });
    }

    // Build prompt
    const prompt = buildCoachPrompt(request);

    // Generate explanation
    const explanation = await bedrockClient.generateText(prompt);

    // Refine concept tags
    const conceptTags = refineConceptTags(
      request.conceptTag || 'general',
      0, // evalDelta not available here, would need to be passed
      request.pv || []
    );

    const response: ExplainChoiceResponse = {
      explanation,
      conceptTags,
    };

    res.json(response);
  } catch (error) {
    console.error('Error generating explanation:', error);
    res.status(500).json({ error: 'Failed to generate explanation' });
  }
});

export default router;

