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
    // Get all legal moves for scoring (ensures we always have diversity)
    const allLegalMoves = this.getAllLegalMoves(fen);
    
    // Score a sample of legal moves (limit to avoid timeout)
    const movesToScore = allLegalMoves.slice(0, 15);
    const scored = await this.deps.engineClient.scoreMoves({ fen, moves: movesToScore });
    
    // Sort by evaluation delta (best moves first)
    const sortedScores = scored.scores.sort((a, b) => b.evalDelta - a.evalDelta);

    // Build style preferences map
    const styleForMove = new Map<string, MasterStyle>();
    for (const { move, styleId } of validatedStyleMoves) {
      if (!styleForMove.has(move)) {
        styleForMove.set(move, styleId);
      }
    }

    // Assign masters to moves based on move characteristics (fallback logic)
    const masterAssignments: MasterStyle[] = ['fischer', 'tal', 'capablanca', 'karpov'];

    const choices: MoveChoice[] = [];
    const usedMoves = new Set<string>();

    // Choice A: Best move (Fischer - precise/best)
    const bestMoveToUse = bestMove || sortedScores[0]?.move;
    if (bestMoveToUse) {
      choices.push({
        id: 'A',
        moveUci: bestMoveToUse,
        styleId: styleForMove.get(bestMoveToUse) || 'fischer',
        planOneLiner: this.generatePlanOneLiner(bestMoveToUse, 'fischer', engineAnalysis.pv),
        pv: [bestMoveToUse, ...engineAnalysis.pv.slice(1, 4)],
        eval: engineAnalysis.eval,
        conceptTags: this.inferConceptTags(engineAnalysis.pv),
      });
      usedMoves.add(bestMoveToUse);
    }

    // Choice B & C: Other good moves with different masters
    for (const s of sortedScores) {
      if (choices.length >= 3) break;
      if (usedMoves.has(s.move)) continue;

      // Assign master style based on position or use rotation
      const masterIndex = choices.length % masterAssignments.length;
      const assignedStyle = styleForMove.get(s.move) || masterAssignments[masterIndex];
      
      choices.push({
        id: String.fromCharCode(65 + choices.length), // 'A', 'B', 'C'
        moveUci: s.move,
        styleId: assignedStyle,
        planOneLiner: this.generatePlanOneLiner(s.move, assignedStyle, s.pv),
        pv: s.pv.length > 0 ? s.pv : [s.move],
        eval: engineAnalysis.eval + s.evalDelta,
        conceptTags: this.inferConceptTags(s.pv),
      });
      usedMoves.add(s.move);
    }

    // Fallback: if we still don't have 3 choices, use remaining legal moves
    let fallbackIndex = 0;
    while (choices.length < 3 && fallbackIndex < allLegalMoves.length) {
      const move = allLegalMoves[fallbackIndex];
      if (!usedMoves.has(move)) {
        const masterIndex = choices.length % masterAssignments.length;
        choices.push({
          id: String.fromCharCode(65 + choices.length),
          moveUci: move,
          styleId: masterAssignments[masterIndex],
          planOneLiner: this.generatePlanOneLiner(move, masterAssignments[masterIndex], []),
          pv: [move],
          eval: engineAnalysis.eval,
          conceptTags: ['development'],
        });
        usedMoves.add(move);
      }
      fallbackIndex++;
    }

    return choices;
  }

  /**
   * Get all legal moves in UCI format using chess.js
   */
  private getAllLegalMoves(fen: string): string[] {
    const { Chess } = require('chess.js');
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    return moves.map((m: { from: string; to: string; promotion?: string }) => 
      `${m.from}${m.to}${m.promotion || ''}`
    );
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

