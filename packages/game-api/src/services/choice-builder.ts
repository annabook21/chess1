/**
 * Choice Builder
 * 
 * Builds 3 move choices from engine analysis and style suggestions.
 * Pure function - no side effects.
 */

import {
  MoveChoice,
  MasterStyle,
  ConceptTag,
  STRATEGY_TAGS,
  TACTICS_TAGS,
  ENDGAME_TAGS,
} from '@master-academy/contracts';
import { EngineClient } from '../adapters/engine-client';
import { StyleClient } from '../adapters/style-client';

const MASTER_STYLES: MasterStyle[] = ['capablanca', 'tal', 'karpov', 'fischer'];

interface ChoiceBuilderDeps {
  engineClient: EngineClient;
  styleClient: StyleClient;
}

export class ChoiceBuilder {
  constructor(private deps: ChoiceBuilderDeps) {}

  /**
   * Build 3 choices for a position
   */
  async buildChoices(
    fen: string,
    difficulty: { engineElo: number; hintLevel: number }
  ): Promise<MoveChoice[]> {
    // Get engine's best move and top lines
    const engineAnalysis = await this.deps.engineClient.analyzePosition({
      fen,
      depth: 12,
    });

    // Get style suggestions from all 4 masters (Bedrock-powered)
    const styleSuggestions = await Promise.all(
      MASTER_STYLES.map(async (styleId) => {
        try {
          const moves = await this.deps.styleClient.suggestMoves(fen, styleId, 5);
          return { styleId, moves };
        } catch (error) {
          console.error(`Error getting ${styleId} suggestions:`, error);
          return { styleId, moves: [] };
        }
      })
    );

    // Filter style moves through engine validation
    const validatedStyleMoves = await this.validateStyleMoves(fen, styleSuggestions);

    const bestMoveCandidate =
      engineAnalysis.pv[0] ||
      validatedStyleMoves[0]?.move ||
      '';

    // Select 3 diverse choices
    const choices = this.selectDiverseChoices(
      fen,
      bestMoveCandidate,
      validatedStyleMoves,
      engineAnalysis
    );

    return choices;
  }

  private async validateStyleMoves(
    fen: string,
    styleSuggestions: Array<{ styleId: MasterStyle; moves: string[] }>
  ): Promise<Array<{ styleId: MasterStyle; move: string }>> {
    const validated: Array<{ styleId: MasterStyle; move: string }> = [];

    for (const { styleId, moves } of styleSuggestions) {
      for (const move of moves) {
        const isLegal = await this.deps.engineClient.isLegalMove(fen, move);
        if (isLegal) {
          validated.push({ styleId, move });
          break; // Take first legal move from each style
        }
      }
    }

    return validated;
  }

  private async selectDiverseChoices(
    fen: string,
    bestMove: string,
    validatedStyleMoves: Array<{ styleId: MasterStyle; move: string }>,
    engineAnalysis: { eval: number; pv: string[] }
  ): Promise<MoveChoice[]> {
    // Score all candidate moves
    const candidates = [
      ...(bestMove ? [{ move: bestMove, styleId: 'fischer' as MasterStyle }] : []),
      ...validatedStyleMoves,
    ];

    const uniqueMoves = new Map<string, MasterStyle>();
    for (const { move, styleId } of candidates) {
      if (!uniqueMoves.has(move)) {
        uniqueMoves.set(move, styleId);
      }
    }

    const movesToScore = Array.from(uniqueMoves.keys()).slice(0, 10);
    const scored = await this.deps.engineClient.scoreMoves({ fen, moves: movesToScore });

    // Select 3 diverse choices (best + 2 style-based)
    const choices: MoveChoice[] = [];
    const usedMoves = new Set<string>();

    // Always include best move as choice A (fall back to top scored if bestMove missing)
    const bestMoveToUse = bestMove || scored.scores[0]?.move;
    const bestScored = bestMoveToUse ? scored.scores.find(s => s.move === bestMoveToUse) : undefined;
    if (bestScored && bestMoveToUse) {
      choices.push({
        id: 'A',
        moveUci: bestMoveToUse,
        styleId: 'fischer',
        planOneLiner: this.generatePlanOneLiner(bestMoveToUse, 'fischer', engineAnalysis.pv),
        pv: [bestMoveToUse, ...engineAnalysis.pv.slice(1, 4)],
        eval: engineAnalysis.eval,
        conceptTags: this.inferConceptTags(engineAnalysis.pv),
      });
      usedMoves.add(bestMoveToUse);
    }

    // Add 2 more diverse style-based choices
    const styleChoices = validatedStyleMoves
      .filter(({ move }) => !usedMoves.has(move))
      .slice(0, 2);

    for (let i = 0; i < styleChoices.length && choices.length < 3; i++) {
      const { move, styleId } = styleChoices[i];
      const scoredMove = scored.scores.find(s => s.move === move);
      
      if (scoredMove) {
        choices.push({
          id: String.fromCharCode(66 + i), // 'B', 'C'
          moveUci: move,
          styleId,
          planOneLiner: this.generatePlanOneLiner(move, styleId, scoredMove.pv),
          pv: scoredMove.pv,
          eval: engineAnalysis.eval + scoredMove.evalDelta,
          conceptTags: this.inferConceptTags(scoredMove.pv),
        });
        usedMoves.add(move);
      }
    }

    // If we don't have 3 yet, fill with engine-scored moves
    for (const s of scored.scores) {
      if (choices.length >= 3) break;
      if (usedMoves.has(s.move)) continue;
      choices.push({
        id: String.fromCharCode(65 + choices.length), // 'A', 'B', 'C'
        moveUci: s.move,
        styleId: 'fischer',
        planOneLiner: this.generatePlanOneLiner(s.move, 'fischer', s.pv),
        pv: s.pv,
        eval: engineAnalysis.eval + s.evalDelta,
        conceptTags: this.inferConceptTags(s.pv),
      });
      usedMoves.add(s.move);
    }

    // If still fewer than 3, duplicate best move as last resort
    while (choices.length < 3 && bestMoveToUse) {
      choices.push({
        id: String.fromCharCode(65 + choices.length),
        moveUci: bestMoveToUse,
        styleId: 'fischer',
        planOneLiner: this.generatePlanOneLiner(bestMoveToUse, 'fischer', engineAnalysis.pv),
        pv: [bestMoveToUse, ...engineAnalysis.pv.slice(1, 4)],
        eval: engineAnalysis.eval,
        conceptTags: this.inferConceptTags(engineAnalysis.pv),
      });
    }

    return choices;
  }

  private generatePlanOneLiner(
    move: string,
    styleId: MasterStyle,
    pv: string[]
  ): string {
    const stylePlans: Record<MasterStyle, string[]> = {
      capablanca: [
        'Simplify and convert small edge',
        'Improve piece placement',
        'Create endgame advantage',
        'Control key squares',
      ],
      tal: [
        'Create tactical complications',
        'Launch aggressive attack',
        'Sacrifice for initiative',
        'Force opponent into difficult position',
      ],
      karpov: [
        'Build positional pressure',
        'Restrict opponent options',
        'Accumulate small advantages',
        'Control the position',
      ],
      fischer: [
        'Play the most precise move',
        'Follow opening principles',
        'Maintain initiative',
        'Seize the advantage',
      ],
    };

    const plans = stylePlans[styleId];
    return plans[Math.floor(Math.random() * plans.length)];
  }

  private inferConceptTags(pv: string[]): ConceptTag[] {
    const tags: ConceptTag[] = [];
    
    // Simple heuristics - in production, use engine analysis
    if (pv.length > 0) {
      tags.push('development' as ConceptTag);
    }
    
    // Add more sophisticated tag inference based on move patterns
    // This is simplified - real implementation would analyze the position
    
    return tags.length > 0 ? tags : ['development'];
  }
}

