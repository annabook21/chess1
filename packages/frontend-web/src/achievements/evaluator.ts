/**
 * Achievement Evaluator
 * Event-driven achievement tracking with incremental progress
 * 
 * Based on best practices from trophy.so:
 * - Event-based triggers (not polling)
 * - Incremental progress tracking
 * - Denormalized completion state
 */

import { 
  AchievementEvent, 
  PlayerStats, 
  AchievementProgress, 
  AchievementUpdateResult,
  AchievementStore,
  DEFAULT_PLAYER_STATS,
  Achievement,
  AchievementTrigger,
} from './types';

/** Calculate target value from trigger */
const getTargetValue = (trigger: AchievementTrigger): number => {
  switch (trigger.type) {
    case 'games_played': return trigger.count;
    case 'prediction_streak': return trigger.count;
    case 'best_moves_found': return trigger.count;
    case 'tactics_found': return trigger.count;
    case 'brilliant_moves': return trigger.count;
    case 'accuracy_threshold': return trigger.percentage;
    case 'rating_reached': return trigger.rating;
    case 'comeback_win': return 1;
    case 'perfect_game': return 1;
    case 'specific_opening': return 1;
    default: return 1;
  }
};

/** Get current value from stats for a trigger */
const getCurrentValue = (trigger: AchievementTrigger, stats: PlayerStats): number => {
  switch (trigger.type) {
    case 'games_played': return stats.gamesPlayed;
    case 'prediction_streak': return stats.maxPredictionStreak;
    case 'best_moves_found': return stats.bestMovesFound;
    case 'tactics_found': return stats.tacticsFound;
    case 'brilliant_moves': return stats.brilliantMoves;
    case 'rating_reached': return stats.peakRating;
    case 'comeback_win': return stats.comebackWins > 0 ? 1 : 0;
    case 'perfect_game': return stats.perfectGames > 0 ? 1 : 0;
    case 'accuracy_threshold': return 0; // Handled per-game
    case 'specific_opening': return 0; // Handled per-game
    default: return 0;
  }
};

/** Generate display text for progress */
const getDisplayText = (achievement: Achievement, current: number, target: number): string => {
  const trigger = achievement.trigger;
  
  switch (trigger.type) {
    case 'games_played':
      return `${current}/${target} games played`;
    case 'prediction_streak':
      return `Best streak: ${current}/${target}`;
    case 'best_moves_found':
      return `${current}/${target} best moves`;
    case 'tactics_found':
      return `${current}/${target} tactics found`;
    case 'brilliant_moves':
      return `${current}/${target} brilliant moves`;
    case 'rating_reached':
      return `Peak rating: ${current}/${target}`;
    case 'accuracy_threshold':
      return `Need ${target}% accuracy game`;
    case 'comeback_win':
      return current > 0 ? 'Completed!' : 'Win while down 3+ pawns';
    case 'perfect_game':
      return current > 0 ? 'Completed!' : 'No blunders or mistakes';
    default:
      return `${current}/${target}`;
  }
};

/** Create initial progress for an achievement */
export const createProgress = (
  achievement: Achievement, 
  stats: PlayerStats
): AchievementProgress => {
  const target = getTargetValue(achievement.trigger);
  const current = getCurrentValue(achievement.trigger, stats);
  const completed = current >= target;
  
  return {
    achievementId: achievement.id,
    currentValue: current,
    targetValue: target,
    completed,
    completedAt: completed ? new Date().toISOString() : undefined,
    percentComplete: Math.min(100, Math.round((current / target) * 100)),
    displayText: getDisplayText(achievement, current, target),
  };
};

/** Update stats based on an event */
export const updateStats = (
  stats: PlayerStats, 
  event: AchievementEvent
): PlayerStats => {
  const newStats = { ...stats };
  
  switch (event.type) {
    case 'GAME_COMPLETED':
      newStats.gamesPlayed++;
      if (event.won) newStats.gamesWon++;
      if (event.blunders === 0 && event.mistakes === 0) {
        newStats.perfectGames++;
      }
      // Reset prediction streak after game
      newStats.currentPredictionStreak = 0;
      break;
      
    case 'MOVE_PLAYED':
      if (event.isBestMove) newStats.bestMovesFound++;
      if (event.isBrilliant) newStats.brilliantMoves++;
      if (event.isTactic) newStats.tacticsFound++;
      break;
      
    case 'PREDICTION_MADE':
      if (event.correct) {
        newStats.currentPredictionStreak = event.streak;
        newStats.maxPredictionStreak = Math.max(
          newStats.maxPredictionStreak, 
          event.streak
        );
      } else {
        newStats.currentPredictionStreak = 0;
      }
      break;
      
    case 'RATING_CHANGED':
      newStats.currentRating = event.newRating;
      newStats.peakRating = Math.max(newStats.peakRating, event.newRating);
      break;
      
    case 'COMEBACK_WIN':
      if (event.evalDeficit >= 300) { // 3+ pawns
        newStats.comebackWins++;
      }
      break;
      
    case 'OPENING_PLAYED':
      newStats.openingsPlayed[event.openingName] = 
        (newStats.openingsPlayed[event.openingName] || 0) + 1;
      break;
  }
  
  return newStats;
};

/** Main evaluator function - processes an event and returns updates */
export const evaluateEvent = (
  event: AchievementEvent,
  achievements: Achievement[],
  store: AchievementStore
): AchievementUpdateResult => {
  // Update stats first
  const newStats = updateStats(store.stats, event);
  const statsChanged: Partial<PlayerStats> = {};
  
  // Track what changed
  for (const key of Object.keys(newStats) as (keyof PlayerStats)[]) {
    if (newStats[key] !== store.stats[key]) {
      (statsChanged as Record<string, unknown>)[key] = newStats[key];
    }
  }
  
  const updatedProgress: AchievementProgress[] = [];
  const newlyCompleted: AchievementProgress[] = [];
  
  // Evaluate each non-completed achievement
  for (const achievement of achievements) {
    if (store.completedIds.has(achievement.id)) {
      continue; // Skip already completed
    }
    
    const oldProgress = store.progress.get(achievement.id);
    const newProgress = createProgress(achievement, newStats);
    
    // Check if progress changed
    const progressChanged = !oldProgress || 
      oldProgress.currentValue !== newProgress.currentValue;
    
    if (progressChanged) {
      updatedProgress.push(newProgress);
      
      // Check if newly completed
      if (newProgress.completed && (!oldProgress || !oldProgress.completed)) {
        newProgress.completedAt = new Date().toISOString();
        newlyCompleted.push(newProgress);
      }
    }
  }
  
  return {
    updatedProgress,
    newlyCompleted,
    statsChanged,
  };
};

/** Create a new achievement store */
export const createStore = (
  achievements: Achievement[],
  initialStats: PlayerStats = DEFAULT_PLAYER_STATS
): AchievementStore => {
  const progress = new Map<string, AchievementProgress>();
  const completedIds = new Set<string>();
  
  for (const achievement of achievements) {
    const prog = createProgress(achievement, initialStats);
    progress.set(achievement.id, prog);
    if (prog.completed) {
      completedIds.add(achievement.id);
    }
  }
  
  return {
    stats: initialStats,
    progress,
    completedIds,
  };
};

/** Apply updates to store (immutable) */
export const applyUpdates = (
  store: AchievementStore,
  result: AchievementUpdateResult,
  newStats: PlayerStats
): AchievementStore => {
  const newProgress = new Map(store.progress);
  const newCompletedIds = new Set(store.completedIds);
  
  for (const prog of result.updatedProgress) {
    newProgress.set(prog.achievementId, prog);
  }
  
  for (const prog of result.newlyCompleted) {
    newCompletedIds.add(prog.achievementId);
  }
  
  return {
    stats: newStats,
    progress: newProgress,
    completedIds: newCompletedIds,
  };
};









