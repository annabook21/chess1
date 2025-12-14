/**
 * Common interface for game stores
 */

import { TurnPackage, Side } from '@master-academy/contracts';
import { Chess } from 'chess.js';

export interface GameState {
  gameId: string;
  chess: Chess;
  currentTurn: TurnPackage | null;
  userElo: number;
  createdAt: Date;
}

export interface GameUpdateFields {
  fen?: string;
  currentTurn?: TurnPackage | null;
  userElo?: number;
}

export interface IGameStore {
  createGame(userElo?: number): Promise<string> | string;
  getGame(gameId: string): Promise<GameState | null> | GameState | null;
  updateGame(gameId: string, updates: GameUpdateFields): Promise<void> | void;
  getFen(gameId: string): Promise<string | null> | string | null;
  makeMove(gameId: string, moveUci: string): Promise<boolean> | boolean;
  isGameOver(gameId: string): Promise<boolean> | boolean;
  getSideToMove(gameId: string): Promise<Side | null> | Side | null;
}
