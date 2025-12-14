import { MasterStyle } from '@master-academy/contracts';
import { anthropicPredict } from './anthropic';
import { amazonPredict } from './amazon';

export interface MoveResult {
  move: string;
  justification: string;
}

const provider = process.env.STYLE_MODEL_PROVIDER || 'anthropic';

export async function predictNextMove(fen: string, styleId: MasterStyle): Promise<MoveResult> {
  switch (provider) {
    case 'anthropic':
      return anthropicPredict(fen, styleId);
    case 'amazon':
      return amazonPredict(fen, styleId);
    default:
      throw new Error(`Unsupported model provider: ${provider}`);
  }
}

