/**
 * useAchievements Hook Tests
 * 
 * Tests based on actual implementation in evaluator.ts:
 * - Events update PlayerStats via updateStats()
 * - Stats are compared against AchievementTrigger to calculate progress
 * - Progress is persisted to localStorage
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAchievements } from './useAchievements';
import { Achievement } from './types';

// ============================================================================
// TEST FIXTURES - Based on actual AchievementTrigger types from types.ts
// ============================================================================

const testAchievements: Achievement[] = [
  {
    id: 'test-games-1',
    name: 'First Game',
    flavorText: 'A journey begins',
    description: 'Complete your first game',
    iconKey: 'sword',
    xpReward: 50,
    rarity: 'common',
    trigger: { type: 'games_played', count: 1 },
  },
  {
    id: 'test-games-5',
    name: 'Regular Player',
    flavorText: 'Persistence pays',
    description: 'Complete 5 games',
    iconKey: 'target',
    xpReward: 100,
    rarity: 'uncommon',
    trigger: { type: 'games_played', count: 5 },
  },
  {
    id: 'test-best-moves-10',
    name: 'Sharp Eye',
    flavorText: 'Seeing the best path',
    description: 'Find 10 best moves',
    iconKey: 'eye',
    xpReward: 75,
    rarity: 'uncommon',
    trigger: { type: 'best_moves_found', count: 10 },
  },
  {
    id: 'test-prediction-3',
    name: 'Oracle',
    flavorText: 'The spirits guide you',
    description: 'Get a 3-prediction streak',
    iconKey: 'crystal',
    xpReward: 100,
    rarity: 'rare',
    trigger: { type: 'prediction_streak', count: 3 },
  },
];

// ============================================================================
// TESTS
// ============================================================================

describe('useAchievements', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initialization', () => {
    it('should initialize with default stats (gamesPlayed=0)', () => {
      const { result } = renderHook(() => useAchievements(testAchievements));
      
      expect(result.current.stats.gamesPlayed).toBe(0);
      expect(result.current.stats.bestMovesFound).toBe(0);
    });

    it('should create progress entries for all achievements', () => {
      const { result } = renderHook(() => useAchievements(testAchievements));
      
      expect(result.current.allProgress.length).toBe(testAchievements.length);
    });

    it('should start with no completed achievements', () => {
      const { result } = renderHook(() => useAchievements(testAchievements));
      
      expect(result.current.completedAchievements).toHaveLength(0);
    });
  });

  describe('GAME_COMPLETED event', () => {
    /**
     * Based on evaluator.ts line 113:
     * case 'GAME_COMPLETED':
     *   newStats.gamesPlayed++;
     *   if (event.won) newStats.gamesWon++;
     */
    it('should increment gamesPlayed stat', () => {
      const { result } = renderHook(() => useAchievements(testAchievements));
      
      act(() => {
        result.current.trackEvent({
          type: 'GAME_COMPLETED',
          won: false,
          accuracy: 80,
          blunders: 1,
          mistakes: 2,
        });
      });
      
      expect(result.current.stats.gamesPlayed).toBe(1);
    });

    it('should increment gamesWon when won=true', () => {
      const { result } = renderHook(() => useAchievements(testAchievements));
      
      act(() => {
        result.current.trackEvent({
          type: 'GAME_COMPLETED',
          won: true,
          accuracy: 90,
          blunders: 0,
          mistakes: 1,
        });
      });
      
      expect(result.current.stats.gamesWon).toBe(1);
    });

    it('should complete games_played achievement when count reached', () => {
      const { result } = renderHook(() => useAchievements(testAchievements));
      
      expect(result.current.isCompleted('test-games-1')).toBe(false);
      
      act(() => {
        result.current.trackEvent({
          type: 'GAME_COMPLETED',
          won: true,
          accuracy: 85,
          blunders: 0,
          mistakes: 0,
        });
      });
      
      // After 1 game, test-games-1 (count: 1) should be complete
      expect(result.current.isCompleted('test-games-1')).toBe(true);
      // test-games-5 (count: 5) should NOT be complete
      expect(result.current.isCompleted('test-games-5')).toBe(false);
    });

    it('should track perfectGames when no blunders/mistakes', () => {
      const { result } = renderHook(() => useAchievements(testAchievements));
      
      act(() => {
        result.current.trackEvent({
          type: 'GAME_COMPLETED',
          won: true,
          accuracy: 100,
          blunders: 0,
          mistakes: 0,
        });
      });
      
      expect(result.current.stats.perfectGames).toBe(1);
    });
  });

  describe('MOVE_PLAYED event', () => {
    /**
     * Based on evaluator.ts line 123:
     * case 'MOVE_PLAYED':
     *   if (event.isBestMove) newStats.bestMovesFound++;
     *   if (event.isBrilliant) newStats.brilliantMoves++;
     *   if (event.isTactic) newStats.tacticsFound++;
     */
    it('should increment bestMovesFound when isBestMove=true', () => {
      const { result } = renderHook(() => useAchievements(testAchievements));
      
      act(() => {
        result.current.trackEvent({
          type: 'MOVE_PLAYED',
          isBestMove: true,
          isBrilliant: false,
          isTactic: false,
        });
      });
      
      expect(result.current.stats.bestMovesFound).toBe(1);
    });

    it('should increment brilliantMoves when isBrilliant=true', () => {
      const { result } = renderHook(() => useAchievements(testAchievements));
      
      act(() => {
        result.current.trackEvent({
          type: 'MOVE_PLAYED',
          isBestMove: false,
          isBrilliant: true,
          isTactic: false,
        });
      });
      
      expect(result.current.stats.brilliantMoves).toBe(1);
    });

    it('should track progress towards best_moves_found achievement', () => {
      const { result } = renderHook(() => useAchievements(testAchievements));
      
      // Play 5 best moves (need 10 for achievement)
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.trackEvent({
            type: 'MOVE_PLAYED',
            isBestMove: true,
            isBrilliant: false,
            isTactic: false,
          });
        });
      }
      
      const progress = result.current.getProgress('test-best-moves-10');
      expect(progress?.currentValue).toBe(5);
      expect(progress?.targetValue).toBe(10);
      expect(progress?.percentComplete).toBe(50);
      expect(progress?.completed).toBe(false);
    });
  });

  describe('PREDICTION_MADE event', () => {
    /**
     * Based on evaluator.ts line 129:
     * case 'PREDICTION_MADE':
     *   if (event.correct) {
     *     newStats.currentPredictionStreak = event.streak;
     *     newStats.maxPredictionStreak = Math.max(...)
     */
    it('should update prediction streak stats', () => {
      const { result } = renderHook(() => useAchievements(testAchievements));
      
      act(() => {
        result.current.trackEvent({
          type: 'PREDICTION_MADE',
          correct: true,
          streak: 2,
        });
      });
      
      expect(result.current.stats.currentPredictionStreak).toBe(2);
      expect(result.current.stats.maxPredictionStreak).toBe(2);
    });

    it('should reset streak on incorrect prediction', () => {
      const { result } = renderHook(() => useAchievements(testAchievements));
      
      // Build streak
      act(() => {
        result.current.trackEvent({
          type: 'PREDICTION_MADE',
          correct: true,
          streak: 2,
        });
      });
      
      // Break streak
      act(() => {
        result.current.trackEvent({
          type: 'PREDICTION_MADE',
          correct: false,
          streak: 0,
        });
      });
      
      expect(result.current.stats.currentPredictionStreak).toBe(0);
      // Max should still be 2
      expect(result.current.stats.maxPredictionStreak).toBe(2);
    });

    it('should complete prediction_streak achievement', () => {
      const { result } = renderHook(() => useAchievements(testAchievements));
      
      // Get 3-streak
      act(() => {
        result.current.trackEvent({
          type: 'PREDICTION_MADE',
          correct: true,
          streak: 3,
        });
      });
      
      expect(result.current.isCompleted('test-prediction-3')).toBe(true);
    });
  });

  describe('XP calculation', () => {
    it('should sum XP from completed achievements', () => {
      const { result } = renderHook(() => useAchievements(testAchievements));
      
      expect(result.current.totalXp).toBe(0);
      
      // Complete first game (50 XP)
      act(() => {
        result.current.trackEvent({
          type: 'GAME_COMPLETED',
          won: true,
          accuracy: 90,
          blunders: 0,
          mistakes: 0,
        });
      });
      
      expect(result.current.totalXp).toBe(50);
    });
  });

  describe('localStorage persistence', () => {
    it('should save to localStorage on state change', () => {
      const { result } = renderHook(() => useAchievements(testAchievements));
      
      act(() => {
        result.current.trackEvent({
          type: 'GAME_COMPLETED',
          won: true,
          accuracy: 90,
          blunders: 0,
          mistakes: 0,
        });
      });
      
      const stored = localStorage.getItem('castle-achievements');
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.stats.gamesPlayed).toBe(1);
    });

    it('should load from localStorage on init', () => {
      // Pre-populate
      localStorage.setItem('castle-achievements', JSON.stringify({
        stats: { 
          gamesPlayed: 10,
          gamesWon: 5,
          currentPredictionStreak: 0,
          maxPredictionStreak: 4,
          bestMovesFound: 20,
          tacticsFound: 5,
          brilliantMoves: 2,
          perfectGames: 1,
          currentRating: 1350,
          peakRating: 1400,
          comebackWins: 0,
          openingsPlayed: {},
        },
        completedIds: ['test-games-1', 'test-games-5'],
        progressMap: {},
      }));
      
      const { result } = renderHook(() => useAchievements(testAchievements));
      
      expect(result.current.stats.gamesPlayed).toBe(10);
      expect(result.current.isCompleted('test-games-1')).toBe(true);
      expect(result.current.isCompleted('test-games-5')).toBe(true);
    });
  });

  describe('resetProgress', () => {
    it('should reset all stats and clear localStorage', () => {
      const { result } = renderHook(() => useAchievements(testAchievements));
      
      // Build up state
      act(() => {
        result.current.trackEvent({
          type: 'GAME_COMPLETED',
          won: true,
          accuracy: 90,
          blunders: 0,
          mistakes: 0,
        });
      });
      
      expect(result.current.stats.gamesPlayed).toBe(1);
      
      // Reset
      act(() => {
        result.current.resetProgress();
      });
      
      expect(result.current.stats.gamesPlayed).toBe(0);
      expect(result.current.completedAchievements).toHaveLength(0);
    });
  });
});


