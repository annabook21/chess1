/**
 * Achievement Schema
 * Defines structure for castle-themed achievements
 */

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type AchievementTrigger =
  | { type: 'games_played'; count: number }
  | { type: 'prediction_streak'; count: number }
  | { type: 'best_moves_found'; count: number }
  | { type: 'tactics_found'; count: number }
  | { type: 'brilliant_moves'; count: number }
  | { type: 'accuracy_threshold'; percentage: number }
  | { type: 'rating_reached'; rating: number }
  | { type: 'specific_opening'; openingName: string }
  | { type: 'comeback_win'; evalThreshold: number }
  | { type: 'perfect_game'; noBlunders: boolean; noMistakes: boolean };

export interface Achievement {
  id: string;
  name: string;
  flavorText: string;
  description: string;
  trigger: AchievementTrigger;
  rarity: AchievementRarity;
  iconKey: string;
  xpReward: number;
  roomUnlock?: string;
}

export interface AchievementProgress {
  achievementId: string;
  currentValue: number;
  targetValue: number;
  completed: boolean;
  completedAt?: string;
}

export interface PlayerAchievements {
  playerId: string;
  achievements: AchievementProgress[];
  totalXp: number;
  unlockedRooms: string[];
}











