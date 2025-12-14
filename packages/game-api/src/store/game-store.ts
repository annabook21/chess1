/**
 * Game Store
 * 
 * In-memory store for MVP. Replace with DynamoDB/Postgres in production.
 */

import { Chess } from 'chess.js';
import { TurnPackage, Side } from '@master-academy/contracts';
import { GameState, GameUpdateFields, IGameStore } from './store-interface';

export class GameStore implements IGameStore {
  private games: Map<string, GameState> = new Map();

  createGame(userElo: number = 1200): string {
    const gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const chess = new Chess();
    
    this.games.set(gameId, {
      gameId,
      chess,
      currentTurn: null,
      userElo,
      createdAt: new Date(),
    });

    return gameId;
  }

  getGame(gameId: string): GameState | null {
    return this.games.get(gameId) || null;
  }

  updateGame(gameId: string, updates: GameUpdateFields): void {
    const game = this.games.get(gameId);
    if (!game) return;

    // Handle fen update - recreate chess instance with new FEN
    if (updates.fen !== undefined) {
      try {
        game.chess = new Chess(updates.fen);
      } catch (e) {
        console.error('Invalid FEN in updateGame:', updates.fen);
      }
    }

    // Handle other updates
    if (updates.currentTurn !== undefined) {
      game.currentTurn = updates.currentTurn;
    }
    if (updates.userElo !== undefined) {
      game.userElo = updates.userElo;
    }

    this.games.set(gameId, game);
  }

  getFen(gameId: string): string | null {
    const game = this.games.get(gameId);
    return game ? game.chess.fen() : null;
  }

  makeMove(gameId: string, moveUci: string): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;

    try {
      // Convert UCI to chess.js format
      // UCI: "e2e4" -> chess.js: { from: "e2", to: "e4" }
      const from = moveUci.substring(0, 2);
      const to = moveUci.substring(2, 4);
      const promotion = moveUci.length > 4 ? moveUci[4] : undefined;
      
      const move = game.chess.move({
        from,
        to,
        promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined,
      });
      
      return move !== null;
    } catch {
      return false;
    }
  }

  isGameOver(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) return true;
    return game.chess.isGameOver();
  }

  getSideToMove(gameId: string): Side | null {
    const game = this.games.get(gameId);
    if (!game) return null;
    return game.chess.turn() === 'w' ? 'w' : 'b';
  }
}
