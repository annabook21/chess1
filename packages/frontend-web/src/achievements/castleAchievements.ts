/**
 * Castle Achievement Definitions
 * Guild trials themed achievements with room unlocks
 */

import { Achievement } from './types';

export const CASTLE_ACHIEVEMENTS: Achievement[] = [
  // ════════════════════════════════════════════════════════════
  // COURTYARD (Starting Room) - Basic achievements
  // ════════════════════════════════════════════════════════════
  {
    id: 'first_steps',
    name: 'First Steps',
    flavorText: '"Every journey through the castle begins with a single move..."',
    description: 'Complete your first game',
    trigger: { type: 'games_played', count: 1 },
    rarity: 'common',
    iconKey: 'shield',
    xpReward: 50,
    roomUnlock: 'courtyard',
  },
  {
    id: 'apprentice',
    name: 'Apprentice of the Court',
    flavorText: '"The spirits recognize your dedication, young one."',
    description: 'Play 10 games',
    trigger: { type: 'games_played', count: 10 },
    rarity: 'common',
    iconKey: 'sword',
    xpReward: 100,
  },
  {
    id: 'oracle_sight',
    name: "Oracle's Sight",
    flavorText: '"You begin to see what others cannot..."',
    description: 'Predict opponent moves correctly 3 times in a row',
    trigger: { type: 'prediction_streak', count: 3 },
    rarity: 'uncommon',
    iconKey: 'eye',
    xpReward: 150,
  },

  // ════════════════════════════════════════════════════════════
  // ARMORY - Tactical achievements
  // ════════════════════════════════════════════════════════════
  {
    id: 'tactician',
    name: 'Castle Tactician',
    flavorText: '"The armory recognizes a warrior\'s mind."',
    description: 'Find 10 tactical moves',
    trigger: { type: 'tactics_found', count: 10 },
    rarity: 'uncommon',
    iconKey: 'sword',
    xpReward: 200,
    roomUnlock: 'armory',
  },
  {
    id: 'precision_blade',
    name: 'Precision Blade',
    flavorText: '"Your blade strikes true, every time."',
    description: 'Find 25 best moves',
    trigger: { type: 'best_moves_found', count: 25 },
    rarity: 'uncommon',
    iconKey: 'sword',
    xpReward: 200,
  },
  {
    id: 'brilliant_strike',
    name: 'Brilliant Strike',
    flavorText: '"A move that echoes through the castle halls!"',
    description: 'Find a brilliant move',
    trigger: { type: 'brilliant_moves', count: 1 },
    rarity: 'rare',
    iconKey: 'star',
    xpReward: 300,
  },

  // ════════════════════════════════════════════════════════════
  // LIBRARY - Strategic achievements
  // ════════════════════════════════════════════════════════════
  {
    id: 'scholar',
    name: 'Castle Scholar',
    flavorText: '"The ancient tomes reveal their secrets to you."',
    description: 'Play 25 games',
    trigger: { type: 'games_played', count: 25 },
    rarity: 'uncommon',
    iconKey: 'book',
    xpReward: 200,
    roomUnlock: 'library',
  },
  {
    id: 'seer',
    name: 'The Seer',
    flavorText: '"Five moves ahead... the spirits are impressed."',
    description: 'Achieve a 5-game prediction streak',
    trigger: { type: 'prediction_streak', count: 5 },
    rarity: 'rare',
    iconKey: 'eye',
    xpReward: 300,
  },

  // ════════════════════════════════════════════════════════════
  // CHAPEL - Defensive/Comeback achievements
  // ════════════════════════════════════════════════════════════
  {
    id: 'faithful',
    name: 'The Faithful',
    flavorText: '"Even in darkness, you found the light."',
    description: 'Win a game after being down 3+ pawns',
    trigger: { type: 'comeback_win', evalThreshold: 300 },
    rarity: 'rare',
    iconKey: 'flame',
    xpReward: 400,
    roomUnlock: 'chapel',
  },
  {
    id: 'rising_knight',
    name: 'Rising Knight',
    flavorText: '"Your rating climbs like the castle spires."',
    description: 'Reach 1400 rating',
    trigger: { type: 'rating_reached', rating: 1400 },
    rarity: 'rare',
    iconKey: 'crown',
    xpReward: 350,
  },

  // ════════════════════════════════════════════════════════════
  // CRYPT - Endgame mastery achievements
  // ════════════════════════════════════════════════════════════
  {
    id: 'grave_walker',
    name: 'Grave Walker',
    flavorText: '"You tread where others fear..."',
    description: 'Play 50 games',
    trigger: { type: 'games_played', count: 50 },
    rarity: 'rare',
    iconKey: 'skull',
    xpReward: 350,
    roomUnlock: 'crypt',
  },
  {
    id: 'flawless',
    name: 'Flawless Victory',
    flavorText: '"Not a single misstep. The spirits bow to your mastery."',
    description: 'Complete a game with no blunders or mistakes',
    trigger: { type: 'perfect_game', noBlunders: true, noMistakes: true },
    rarity: 'epic',
    iconKey: 'gem',
    xpReward: 500,
  },

  // ════════════════════════════════════════════════════════════
  // THRONE ROOM - Ultimate achievements
  // ════════════════════════════════════════════════════════════
  {
    id: 'master_tactician',
    name: 'Master Tactician',
    flavorText: '"The throne room recognizes your tactical genius."',
    description: 'Find 50 tactical moves',
    trigger: { type: 'tactics_found', count: 50 },
    rarity: 'epic',
    iconKey: 'trophy',
    xpReward: 500,
    roomUnlock: 'throne_room',
  },
  {
    id: 'grandmaster',
    name: 'Castle Grandmaster',
    flavorText: '"You have conquered the castle. The crown is yours."',
    description: 'Reach 1600 rating',
    trigger: { type: 'rating_reached', rating: 1600 },
    rarity: 'legendary',
    iconKey: 'crown',
    xpReward: 1000,
  },
  {
    id: 'prophet',
    name: 'The Prophet',
    flavorText: '"Ten moves... ten perfect predictions. Are you a spirit yourself?"',
    description: 'Achieve a 10-game prediction streak',
    trigger: { type: 'prediction_streak', count: 10 },
    rarity: 'legendary',
    iconKey: 'eye',
    xpReward: 800,
  },
];

export default CASTLE_ACHIEVEMENTS;

