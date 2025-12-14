import { Router } from 'express';
import { MoveSuggester } from '../services/move-suggester';

const router = Router();
const suggester = new MoveSuggester();

router.post('/suggest', async (req, res) => {
  try {
    const { fen, styleId, topK = 3 } = req.body;
    
    if (!fen || !styleId) {
      return res.status(400).json({ error: 'fen and styleId are required' });
    }

    const moves = await suggester.suggestMoves(fen, styleId, topK);
    res.json({ moves });
  } catch (error) {
    console.error('Style suggestion error:', error);
    res.status(500).json({ error: 'Failed to generate style suggestions' });
  }
});

export const styleRoutes = router;

