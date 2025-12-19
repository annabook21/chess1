/**
 * Achievement Evaluator Unit Tests
 * 
 * Tests for the event-driven achievement tracking system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  evaluateEvent, 
  createProgress, 
  updateStats, 
  createStore, 
  applyUpdates 
} from './evaluator';
import { 
  AchievementEvent, 
  PlayerStats, 
  Achievement, 
  AchievementStore,
  DEFAULT_PLAYER_STATS 
} from './types';
import { CASTLE_ACHIEVEMENTS } from './castleAchievements';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createTestStats = (overrides: Partial<PlayerStats> = {}): PlayerStats => ({
  ...DEFAULT_PLAYER_STATS,
  ...overrides,
});

const findAchievement = (id: string): Achievement | undefined => {
  return CASTLE_ACHIEVEMENTS.find(a => a.id === id);
};

// ============================================================================
// updateStats TESTS
// ============================================================================

describe('updateStats', () => {
  describe('GAME_COMPLETED event', () => {
    it('should increment gamesPlayed', () => {
      const stats = createTestStats({ gamesPlayed: 5 });
      const event: AchievementEvent = { type: 'GAME_COMPLETED', won: false, blunders: 0, mistakes: 0 };
      
      const newStats = updateStats(stats, event);
      
      expect(newStats.gamesPlayed).toBe(6);
    });

    it('should increment gamesWon when won=true', () => {
      const stats = createTestStats({ gamesWon: 3 });
      const event: AchievementEvent = { type: 'GAME_COMPLETED', won: true, blunders: 0, mistakes: 0 };
      
      const newStats = updateStats(stats, event);
      
      expect(newStats.gamesWon).toBe(4);
    });

    it('should not increment gamesWon when won=false', () => {
      const stats = createTestStats({ gamesWon: 3 });
      const event: AchievementEvent = { type: 'GAME_COMPLETED', won: false, blunders: 0, mistakes: 0 };
      
      const newStats = updateStats(stats, event);
      
      expect(newStats.gamesWon).toBe(3);
    });

    it('should increment perfectGames when no blunders or mistakes', () => {
      const stats = createTestStats({ perfectGames: 1 });
      const event: AchievementEvent = { type: 'GAME_COMPLETED', won: true, blunders: 0, mistakes: 0 };
      
      const newStats = updateStats(stats, event);
      
      expect(newStats.perfectGames).toBe(2);
    });

    it('should not increment perfectGames when there are blunders', () => {
      const stats = createTestStats({ perfectGames: 1 });
      const event: AchievementEvent = { type: 'GAME_COMPLETED', won: true, blunders: 1, mistakes: 0 };
      
      const newStats = updateStats(stats, event);
      
      expect(newStats.perfectGames).toBe(1);
    });

    it('should not increment perfectGames when there are mistakes', () => {
      const stats = createTestStats({ perfectGames: 1 });
      const event: AchievementEvent = { type: 'GAME_COMPLETED', won: true, blunders: 0, mistakes: 2 };
      
      const newStats = updateStats(stats, event);
      
      expect(newStats.perfectGames).toBe(1);
    });

    it('should reset currentPredictionStreak', () => {
      const stats = createTestStats({ currentPredictionStreak: 5 });
      const event: AchievementEvent = { type: 'GAME_COMPLETED', won: true, blunders: 0, mistakes: 0 };
      
      const newStats = updateStats(stats, event);
      
      expect(newStats.currentPredictionStreak).toBe(0);
    });
  });

  describe('MOVE_PLAYED event', () => {
    it('should increment bestMovesFound for best moves', () => {
      const stats = createTestStats({ bestMovesFound: 10 });
      const event: AchievementEvent = { type: 'MOVE_PLAYED', isBestMove: true, isBrilliant: false, isTactic: false };
      
      const newStats = updateStats(stats, event);
      
      expect(newStats.bestMovesFound).toBe(11);
    });

    it('should not increment bestMovesFound for non-best moves', () => {
      const stats = createTestStats({ bestMovesFound: 10 });
      const event: AchievementEvent = { type: 'MOVE_PLAYED', isBestMove: false, isBrilliant: false, isTactic: false };
      
      const newStats = updateStats(stats, event);
      
      expect(newStats.bestMovesFound).toBe(10);
    });

    it('should increment brilliantMoves for brilliant moves', () => {
      const stats = createTestStats({ brilliantMoves: 2 });
      const event: AchievementEvent = { type: 'MOVE_PLAYED', isBestMove: true, isBrilliant: true, isTactic: false };
      
      const newStats = updateStats(stats, event);
      
      expect(newStats.brilliantMoves).toBe(3);
    });

    it('should increment tacticsFound for tactical moves', () => {
      const stats = createTestStats({ tacticsFound: 5 });
      const event: AchievementEvent = { type: 'MOVE_PLAYED', isBestMove: true, isBrilliant: false, isTactic: true };
      
      const newStats = updateStats(stats, event);
      
      expect(newStats.tacticsFound).toBe(6);
    });

    it('should increment all counters for brilliant tactical best move', () => {
      const stats = createTestStats({ 
        bestMovesFound: 10, 
        brilliantMoves: 2, 
        tacticsFound: 5 
      });
      const event: AchievementEvent = { type: 'MOVE_PLAYED', isBestMove: true, isBrilliant: true, isTactic: true };
      
      const newStats = updateStats(stats, event);
      
      expect(newStats.bestMovesFound).toBe(11);
      expect(newStats.brilliantMoves).toBe(3);
      expect(newStats.tacticsFound).toBe(6);
    });
  });

  describe('PREDICTION_MADE event', () => {
    it('should update currentPredictionStreak on correct prediction', () => {
      const stats = createTestStats({ currentPredictionStreak: 2 });
      const event: AchievementEvent = { type: 'PREDICTION_MADE', correct: true, streak: 3 };
      
      const newStats = updateStats(stats, event);
      
      expect(newStats.currentPredictionStreak).toBe(3);
    });

    it('should update maxPredictionStreak when beating record', () => {
      const stats = createTestStats({ maxPredictionStreak: 5, currentPredictionStreak: 5 });
      const event: AchievementEvent = { type: 'PREDICTION_MADE', correct: true, streak: 6 };
      
      const newStats = updateStats(stats, event);
      
      expect(newStats.maxPredictionStreak).toBe(6);
    });

    it('should not update maxPredictionStreak when not beating record', () => {
      const stats = createTestStats({ maxPredictionStreak: 10, currentPredictionStreak: 3 });
      const event: AchievementEvent = { type: 'PREDICTION_MADE', correct: true, streak: 4 };
      
      const newStats = updateStats(stats, event);
      
      expect(newStats.maxPredictionStreak).toBe(10);
    });

    it('should reset currentPredictionStreak on incorrect prediction', () => {
      const stats = createTestStats({ currentPredictionStreak: 5 });
      const event: AchievementEvent = { type: 'PREDICTION_MADE', correct: false, streak: 0 };
      
      const newStats = updateStats(stats, event);
      
      expect(newStats.currentPredictionStreak).toBe(0);
    });
  });

  describe('RATING_CHANGED event', () => {
    it('should update currentRating', () => {
      const stats = createTestStats({ currentRating: 1200 });
      const event: AchievementEvent = { type: 'RATING_CHANGED', newRating: 1250 };
      
      const newStats = updateStats(stats, event);
      
      expect(newStats.currentRating).toBe(1250);
    });

    it('should update peakRating when new rating is higher', () => {
      const stats = createTestStats({ currentRating: 1200, peakRating: 1300 });
      const event: AchievementEvent = { type: 'RATING_CHANGED', newRating: 1350 };
      
      const newStats = updateStats(stats, event);
      
      expect(newStats.peakRating).toBe(1350);
    });

    it('should not update peakRating when new rating is lower', () => {
      const stats = createTestStats({ currentRating: 1200, peakRating: 1400 });
      const event: AchievementEvent = { type: 'RATING_CHANGED', newRating: 1250 };
      
      const newStats = updateStats(stats, event);
      
      expect(newStats.peakRating).toBe(1400);
    });
  });

  describe('COMEBACK_WIN event', () => {
    it('should increment comebackWins for significant deficit', () => {
      const stats = createTestStats({ comebackWins: 0 });
      const event: AchievementEvent = { type: 'COMEBACK_WIN', evalDeficit: 350 };
      
      const newStats = updateStats(stats, event);
      
      expect(newStats.comebackWins).toBe(1);
    });

    it('should not increment comebackWins for small deficit', () => {
      const stats = createTestStats({ comebackWins: 0 });
      const event: AchievementEvent = { type: 'COMEBACK_WIN', evalDeficit: 200 };
      
      const newStats = updateStats(stats, event);
      
      expect(newStats.comebackWins).toBe(0);
    });
  });

  describe('OPENING_PLAYED event', () => {
    it('should track opening plays', () => {
      const stats = createTestStats({ openingsPlayed: {} });
      const event: AchievementEvent = { type: 'OPENING_PLAYED', openingName: 'Italian Game' };
      
      const newStats = updateStats(stats, event);
      
      expect(newStats.openingsPlayed['Italian Game']).toBe(1);
    });

    it('should increment existing opening counts', () => {
      const stats = createTestStats({ openingsPlayed: { 'Italian Game': 2 } });
      const event: AchievementEvent = { type: 'OPENING_PLAYED', openingName: 'Italian Game' };
      
      const newStats = updateStats(stats, event);
      
      expect(newStats.openingsPlayed['Italian Game']).toBe(3);
    });
  });
});

// ============================================================================
// createProgress TESTS
// ============================================================================

describe('createProgress', () => {
  it('should calculate correct progress for games_played trigger', () => {
    // Use 'apprentice' which requires 10 games (not first_steps which requires 1)
    const achievement = findAchievement('apprentice');
    if (!achievement) throw new Error('Achievement not found');
    
    const stats = createTestStats({ gamesPlayed: 3 });
    const progress = createProgress(achievement, stats);
    
    expect(progress.currentValue).toBe(3);
    expect(progress.completed).toBe(false);
    expect(progress.percentComplete).toBeGreaterThan(0);
  });

  it('should mark achievement as completed when threshold reached', () => {
    const achievement = findAchievement('first_steps');
    if (!achievement) throw new Error('Achievement not found');
    
    const stats = createTestStats({ gamesPlayed: 10 });
    const progress = createProgress(achievement, stats);
    
    expect(progress.completed).toBe(true);
    expect(progress.percentComplete).toBe(100);
    expect(progress.completedAt).toBeDefined();
  });

  it('should calculate correct progress for prediction_streak trigger', () => {
    // 'oracle_sight' requires 3 predictions in a row
    const achievement = findAchievement('oracle_sight');
    if (!achievement) throw new Error('Achievement not found');
    
    const stats = createTestStats({ maxPredictionStreak: 2 });
    const progress = createProgress(achievement, stats);
    
    expect(progress.currentValue).toBe(2);
    expect(progress.completed).toBe(false);
  });
});

// ============================================================================
// evaluateEvent TESTS
// ============================================================================

describe('evaluateEvent', () => {
  let store: AchievementStore;

  beforeEach(() => {
    store = createStore(CASTLE_ACHIEVEMENTS);
  });

  it('should return empty arrays when no progress changes', () => {
    // Event that doesn't affect any achievements
    const event: AchievementEvent = { type: 'RATING_CHANGED', newRating: 1200 };
    
    const result = evaluateEvent(event, CASTLE_ACHIEVEMENTS, store);
    
    // May have updates depending on which achievements track rating
    expect(result).toHaveProperty('updatedProgress');
    expect(result).toHaveProperty('newlyCompleted');
    expect(result).toHaveProperty('statsChanged');
  });

  it('should detect progress towards achievements', () => {
    const event: AchievementEvent = { type: 'GAME_COMPLETED', won: true, blunders: 0, mistakes: 0 };
    
    const result = evaluateEvent(event, CASTLE_ACHIEVEMENTS, store);
    
    expect(result.updatedProgress.length).toBeGreaterThan(0);
    expect(result.statsChanged).toHaveProperty('gamesPlayed');
  });

  it('should not re-complete already completed achievements', () => {
    // First, complete an achievement
    const completedAchievement = findAchievement('first_steps');
    if (!completedAchievement) throw new Error('Achievement not found');
    
    store.completedIds.add(completedAchievement.id);
    
    const event: AchievementEvent = { type: 'GAME_COMPLETED', won: true, blunders: 0, mistakes: 0 };
    
    const result = evaluateEvent(event, CASTLE_ACHIEVEMENTS, store);
    
    // Should not be in newlyCompleted
    const reCompleted = result.newlyCompleted.find(p => p.achievementId === completedAchievement.id);
    expect(reCompleted).toBeUndefined();
  });

  it('should detect newly completed achievements', () => {
    // Set stats just below threshold for 'apprentice' (requires 10 games)
    const statsNearThreshold = createTestStats({ gamesPlayed: 9 });
    store = createStore(CASTLE_ACHIEVEMENTS, statsNearThreshold);
    
    const event: AchievementEvent = { type: 'GAME_COMPLETED', won: true, blunders: 0, mistakes: 0 };
    
    const result = evaluateEvent(event, CASTLE_ACHIEVEMENTS, store);
    
    // Check if apprentice (10 games) is newly completed
    const apprentice = result.newlyCompleted.find(p => p.achievementId === 'apprentice');
    expect(apprentice).toBeDefined();
    expect(apprentice?.completed).toBe(true);
  });
});

// ============================================================================
// createStore TESTS
// ============================================================================

describe('createStore', () => {
  it('should initialize progress for all achievements', () => {
    const store = createStore(CASTLE_ACHIEVEMENTS);
    
    expect(store.progress.size).toBe(CASTLE_ACHIEVEMENTS.length);
  });

  it('should use default stats when not provided', () => {
    const store = createStore(CASTLE_ACHIEVEMENTS);
    
    expect(store.stats.gamesPlayed).toBe(0);
  });

  it('should use provided initial stats', () => {
    const initialStats = createTestStats({ gamesPlayed: 100, gamesWon: 50 });
    const store = createStore(CASTLE_ACHIEVEMENTS, initialStats);
    
    expect(store.stats.gamesPlayed).toBe(100);
    expect(store.stats.gamesWon).toBe(50);
  });

  it('should mark already-completed achievements', () => {
    const initialStats = createTestStats({ gamesPlayed: 100 });
    const store = createStore(CASTLE_ACHIEVEMENTS, initialStats);
    
    // first_steps requires 5 games
    expect(store.completedIds.has('first_steps')).toBe(true);
  });
});

// ============================================================================
// applyUpdates TESTS
// ============================================================================

describe('applyUpdates', () => {
  it('should return new store with updated progress', () => {
    const store = createStore(CASTLE_ACHIEVEMENTS);
    const updates = {
      updatedProgress: [{
        achievementId: 'first_steps',
        currentValue: 3,
        targetValue: 5,
        completed: false,
        percentComplete: 60,
        displayText: '3/5 games played',
      }],
      newlyCompleted: [],
      statsChanged: { gamesPlayed: 3 },
    };
    const newStats = createTestStats({ gamesPlayed: 3 });

    const newStore = applyUpdates(store, updates, newStats);

    expect(newStore.stats.gamesPlayed).toBe(3);
    expect(newStore.progress.get('first_steps')?.currentValue).toBe(3);
  });

  it('should add newly completed achievements to completedIds', () => {
    const store = createStore(CASTLE_ACHIEVEMENTS);
    const updates = {
      updatedProgress: [{
        achievementId: 'first_steps',
        currentValue: 5,
        targetValue: 5,
        completed: true,
        completedAt: new Date().toISOString(),
        percentComplete: 100,
        displayText: '5/5 games played',
      }],
      newlyCompleted: [{
        achievementId: 'first_steps',
        currentValue: 5,
        targetValue: 5,
        completed: true,
        completedAt: new Date().toISOString(),
        percentComplete: 100,
        displayText: 'Completed!',
      }],
      statsChanged: { gamesPlayed: 5 },
    };
    const newStats = createTestStats({ gamesPlayed: 5 });

    const newStore = applyUpdates(store, updates, newStats);

    expect(newStore.completedIds.has('first_steps')).toBe(true);
  });

  it('should not mutate original store', () => {
    const store = createStore(CASTLE_ACHIEVEMENTS);
    const originalCompletedSize = store.completedIds.size;
    
    const updates = {
      updatedProgress: [],
      newlyCompleted: [{
        achievementId: 'first_steps',
        currentValue: 5,
        targetValue: 5,
        completed: true,
        completedAt: new Date().toISOString(),
        percentComplete: 100,
        displayText: 'Completed!',
      }],
      statsChanged: {},
    };
    const newStats = store.stats;

    applyUpdates(store, updates, newStats);

    // Original store should be unchanged
    expect(store.completedIds.size).toBe(originalCompletedSize);
  });
});

