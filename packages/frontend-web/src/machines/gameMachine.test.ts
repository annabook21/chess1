/**
 * Game Machine Tests
 * 
 * Tests for the XState chess game state machine.
 * Uses mocked actors to avoid network calls.
 */

import { describe, it, expect, vi } from 'vitest';
import { createActor, fromPromise } from 'xstate';
import { gameMachine } from './gameMachine';
import type { TurnPackage } from '@master-academy/contracts';
import type { CreateGameOutput, SubmitMoveOutput } from './actors';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Test data
const mockTurnPackage: TurnPackage = {
  gameId: 'test-game-123',
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  sideToMove: 'w',
  choices: [
    {
      id: 'A',
      moveUci: 'e2e4',
      styleId: 'fischer',
      planOneLiner: 'Control the center',
      pv: ['e2e4', 'e7e5'],
      eval: 0.3,
      conceptTags: ['center-control'],
    },
    {
      id: 'B',
      moveUci: 'd2d4',
      styleId: 'capablanca',
      planOneLiner: 'Queen pawn opening',
      pv: ['d2d4', 'd7d5'],
      eval: 0.25,
      conceptTags: ['center-control'],
    },
  ],
  bestMove: { moveUci: 'e2e4', eval: 0.3 },
  difficulty: { engineElo: 1500, hintLevel: 2 },
  telemetryHints: { timeBudgetMs: 30000 },
};

describe('gameMachine', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('initial state', () => {
    it('starts in idle state', () => {
      const actor = createActor(gameMachine);
      actor.start();
      
      expect(actor.getSnapshot().value).toBe('idle');
      expect(actor.getSnapshot().context.gameId).toBeNull();
      expect(actor.getSnapshot().context.loading).toBe(false);
      
      actor.stop();
    });
  });
  
  describe('game creation flow', () => {
    it('transitions from idle to creatingGame on START_GAME', () => {
      // Create a mock actor that never resolves (to test intermediate state)
      const mockCreateGameActor = fromPromise<CreateGameOutput, any>(
        () => new Promise(() => {}) // Never resolves
      );
      
      const testMachine = gameMachine.provide({
        actors: {
          createGameActor: mockCreateGameActor,
        },
      });
      
      const actor = createActor(testMachine);
      actor.start();
      
      actor.send({ type: 'START_GAME' });
      
      expect(actor.getSnapshot().value).toBe('creatingGame');
      expect(actor.getSnapshot().context.loading).toBe(true);
      
      actor.stop();
    });
    
    it('transitions from creatingGame to playing on successful creation', async () => {
      // Create a mock actor that resolves immediately
      const mockCreateGameActor = fromPromise<CreateGameOutput, any>(
        async () => ({
          gameId: 'test-game-123',
          turnPackage: mockTurnPackage,
        })
      );
      
      const testMachine = gameMachine.provide({
        actors: {
          createGameActor: mockCreateGameActor,
        },
      });
      
      const actor = createActor(testMachine);
      actor.start();
      
      actor.send({ type: 'START_GAME' });
      
      // Wait for the promise to resolve
      await vi.waitFor(() => {
        const snapshot = actor.getSnapshot();
        expect(snapshot.value).toEqual({ playing: { playerTurn: 'selectingMove' } });
      });
      
      const snapshot = actor.getSnapshot();
      expect(snapshot.context.gameId).toBe('test-game-123');
      expect(snapshot.context.fen).toBe(mockTurnPackage.fen);
      expect(snapshot.context.choices).toHaveLength(2);
      expect(snapshot.context.loading).toBe(false);
      
      actor.stop();
    });
    
    it('transitions from creatingGame to error on failure', async () => {
      // Create a mock actor that rejects
      const mockCreateGameActor = fromPromise<CreateGameOutput, any>(
        async () => { throw new Error('Network error'); }
      );
      
      const testMachine = gameMachine.provide({
        actors: {
          createGameActor: mockCreateGameActor,
        },
      });
      
      const actor = createActor(testMachine);
      actor.start();
      
      actor.send({ type: 'START_GAME' });
      
      // Wait for the promise to reject
      await vi.waitFor(() => {
        expect(actor.getSnapshot().value).toBe('error');
      });
      
      expect(actor.getSnapshot().context.error).toBe('Network error');
      
      actor.stop();
    });
  });
  
  describe('move selection flow', () => {
    async function createPlayingActor() {
      const mockCreateGameActor = fromPromise<CreateGameOutput, any>(
        async () => ({
          gameId: 'test-game',
          turnPackage: mockTurnPackage,
        })
      );
      
      // Mock submit actor that never resolves initially
      const mockSubmitMoveActor = fromPromise<SubmitMoveOutput, any>(
        () => new Promise(() => {})
      );
      
      const testMachine = gameMachine.provide({
        actors: {
          createGameActor: mockCreateGameActor,
          submitMoveActor: mockSubmitMoveActor,
        },
      });
      
      const actor = createActor(testMachine);
      actor.start();
      
      actor.send({ type: 'START_GAME' });
      
      // Wait for game to be created
      await vi.waitFor(() => {
        expect(actor.getSnapshot().value).toEqual({ playing: { playerTurn: 'selectingMove' } });
      });
      
      return actor;
    }
    
    it('selects a choice', async () => {
      const actor = await createPlayingActor();
      
      actor.send({ type: 'SELECT_CHOICE', choiceId: 'A' });
      
      expect(actor.getSnapshot().context.selectedChoice).toBe('A');
      
      actor.stop();
    });
    
    it('transitions to submittingMove on SUBMIT_MOVE', async () => {
      const actor = await createPlayingActor();
      
      actor.send({ type: 'SELECT_CHOICE', choiceId: 'A' });
      actor.send({ type: 'SUBMIT_MOVE', choiceId: 'A' });
      
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toEqual({ playing: { playerTurn: 'submittingMove' } });
      expect(snapshot.context.loading).toBe(true);
      expect(snapshot.context.pendingMove).not.toBeNull();
      expect(snapshot.context.pendingMove?.choice.moveUci).toBe('e2e4');
      
      actor.stop();
    });
    
    it('applies optimistic FEN update on SUBMIT_MOVE', async () => {
      const actor = await createPlayingActor();
      
      actor.send({ type: 'SELECT_CHOICE', choiceId: 'A' });
      actor.send({ type: 'SUBMIT_MOVE', choiceId: 'A' });
      
      const snapshot = actor.getSnapshot();
      // After e2e4, the optimistic FEN should show the pawn moved
      expect(snapshot.context.optimisticFen).toContain('P'); // Should have the position after e2e4
      expect(snapshot.context.optimisticFen).not.toBe(mockTurnPackage.fen);
      
      actor.stop();
    });
  });
  
  describe('game end flow', () => {
    async function createPlayingActorForGameEnd() {
      const mockCreateGameActor = fromPromise<CreateGameOutput, any>(
        async () => ({
          gameId: 'test-game',
          turnPackage: mockTurnPackage,
        })
      );
      
      const testMachine = gameMachine.provide({
        actors: {
          createGameActor: mockCreateGameActor,
        },
      });
      
      const actor = createActor(testMachine);
      actor.start();
      
      actor.send({ type: 'START_GAME' });
      
      await vi.waitFor(() => {
        expect(actor.getSnapshot().value).toEqual({ playing: { playerTurn: 'selectingMove' } });
      });
      
      return actor;
    }
    
    it('transitions to gameOver on GAME_END', async () => {
      const actor = await createPlayingActorForGameEnd();
      
      // End game
      actor.send({
        type: 'GAME_END',
        result: 'victory',
        stats: { xpEarned: 100, movesPlayed: 20, accuracy: 85 },
      });
      
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe('gameOver');
      expect(snapshot.context.gameEndState).toBe('victory');
      expect(snapshot.context.gameStats).toEqual({
        xpEarned: 100,
        movesPlayed: 20,
        accuracy: 85,
      });
      
      actor.stop();
    });
    
    it('transitions from gameOver to idle on NEW_GAME', async () => {
      const actor = await createPlayingActorForGameEnd();
      
      // End game
      actor.send({
        type: 'GAME_END',
        result: 'victory',
        stats: { xpEarned: 100, movesPlayed: 20, accuracy: 85 },
      });
      
      // Start new game
      actor.send({ type: 'NEW_GAME' });
      
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toBe('idle');
      expect(snapshot.context.gameId).toBeNull();
      expect(snapshot.context.gameEndState).toBeNull();
      
      actor.stop();
    });
  });
  
  describe('settings', () => {
    it('toggles settings panel', () => {
      const actor = createActor(gameMachine);
      actor.start();
      
      expect(actor.getSnapshot().context.showSettings).toBe(false);
      
      actor.send({ type: 'TOGGLE_SETTINGS' });
      expect(actor.getSnapshot().context.showSettings).toBe(true);
      
      actor.send({ type: 'TOGGLE_SETTINGS' });
      expect(actor.getSnapshot().context.showSettings).toBe(false);
      
      actor.stop();
    });
    
    it('updates settings', () => {
      const actor = createActor(gameMachine);
      actor.start();
      
      actor.send({
        type: 'UPDATE_SETTINGS',
        settings: {
          opponentType: 'human-like',
          maiaOpponentRating: 1600,
          playMode: 'free',
        },
      });
      
      const ctx = actor.getSnapshot().context;
      expect(ctx.opponentType).toBe('human-like');
      expect(ctx.maiaOpponentRating).toBe(1600);
      expect(ctx.playMode).toBe('free');
      
      actor.stop();
    });
  });
  
  describe('error handling', () => {
    it('transitions from error to idle on RETRY', async () => {
      const mockCreateGameActor = fromPromise<CreateGameOutput, any>(
        async () => { throw new Error('Test error'); }
      );
      
      const testMachine = gameMachine.provide({
        actors: {
          createGameActor: mockCreateGameActor,
        },
      });
      
      const actor = createActor(testMachine);
      actor.start();
      
      actor.send({ type: 'START_GAME' });
      
      await vi.waitFor(() => {
        expect(actor.getSnapshot().value).toBe('error');
      });
      
      actor.send({ type: 'RETRY' });
      
      expect(actor.getSnapshot().value).toBe('idle');
      expect(actor.getSnapshot().context.error).toBeNull();
      
      actor.stop();
    });
  });
  
  describe('prediction flow', () => {
    it('enters prediction mode when enabled and using human-like opponent', async () => {
      const mockCreateGameActor = fromPromise<CreateGameOutput, any>(
        async () => ({
          gameId: 'test-game',
          turnPackage: mockTurnPackage,
        })
      );
      
      const mockSubmitMoveActor = fromPromise<SubmitMoveOutput, any>(
        async () => ({
          response: {
            accepted: true,
            newFen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
            feedback: {
              evalBefore: 0,
              evalAfter: 0.3,
              delta: 0.3,
              coachText: 'Good move!',
              conceptTags: ['center-control'],
              blunder: false,
            },
            nextTurn: {
              ...mockTurnPackage,
              fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
              sideToMove: 'b',
            },
          },
          fenAfterMove: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        })
      );
      
      const testMachine = gameMachine.provide({
        actors: {
          createGameActor: mockCreateGameActor,
          submitMoveActor: mockSubmitMoveActor,
        },
      });
      
      const actor = createActor(testMachine);
      actor.start();
      
      // Set up for prediction mode
      actor.send({
        type: 'UPDATE_SETTINGS',
        settings: { opponentType: 'human-like', predictionEnabled: true },
      });
      
      actor.send({ type: 'START_GAME' });
      
      await vi.waitFor(() => {
        expect(actor.getSnapshot().value).toEqual({ playing: { playerTurn: 'selectingMove' } });
      });
      
      actor.send({ type: 'SELECT_CHOICE', choiceId: 'A' });
      actor.send({ type: 'SUBMIT_MOVE', choiceId: 'A' });
      
      // Should transition to awaitingPrediction
      await vi.waitFor(() => {
        expect(actor.getSnapshot().value).toEqual({ playing: { playerTurn: 'awaitingPrediction' } });
      });
      
      actor.stop();
    });
  });
});
