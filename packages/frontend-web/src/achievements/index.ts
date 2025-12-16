/**
 * Achievement System - Public API
 */

export { AchievementProvider, useAchievementContext } from './AchievementProvider';
export { CASTLE_ACHIEVEMENTS } from './castleAchievements';
export { useAchievements } from './useAchievements';
export { 
  evaluateEvent, 
  createStore, 
  applyUpdates, 
  updateStats, 
  createProgress 
} from './evaluator';
export type {
  Achievement,
  AchievementProgress,
  AchievementEvent,
  AchievementTrigger,
  AchievementRarity,
} from './types';
