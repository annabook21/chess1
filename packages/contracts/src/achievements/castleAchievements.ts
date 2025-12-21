/**
 * Castle-Themed Achievements
 * Cursed relics and guild badges
 */

import { Achievement } from './schema';

export const CASTLE_ACHIEVEMENTS: Achievement[] = [
  // Courtyard (Beginner)
  {
    id: 'initiate-trial',
    name: 'The Initiate\'s Trial',
    flavorText: 'The castle doors creak open for a new seeker...',
    description: 'Complete your first game in the castle.',
    trigger: { type: 'games_played', count: 1 },
    rarity: 'common',
    iconKey: '🚪',
    xpReward: 50,
    roomUnlock: 'courtyard',
  },
  {
    id: 'first-vision',
    name: 'First Vision',
    flavorText: 'The mists part, revealing glimpses of the enemy\'s intent.',
    description: 'Correctly predict an opponent\'s move.',
    trigger: { type: 'prediction_streak', count: 1 },
    rarity: 'common',
    iconKey: '👁️',
    xpReward: 75,
  },
  {
    id: 'steady-hand',
    name: 'Steady Hand',
    flavorText: 'The spirit notes your growing composure.',
    description: 'Find 10 best moves in a single game.',
    trigger: { type: 'best_moves_found', count: 10 },
    rarity: 'common',
    iconKey: '✋',
    xpReward: 100,
  },

  // Armory (Tactics)
  {
    id: 'blade-in-shadow',
    name: 'Blade in the Shadow',
    flavorText: 'A hidden dagger finds its mark!',
    description: 'Discover 5 tactical combinations.',
    trigger: { type: 'tactics_found', count: 5 },
    rarity: 'uncommon',
    iconKey: '🗡️',
    xpReward: 150,
    roomUnlock: 'armory',
  },
  {
    id: 'forked-tongue',
    name: 'Forked Tongue of the Serpent',
    flavorText: 'Two threats from one strike - the serpent\'s way.',
    description: 'Execute 3 fork tactics in games.',
    trigger: { type: 'tactics_found', count: 3 },
    rarity: 'uncommon',
    iconKey: '🐍',
    xpReward: 175,
  },
  {
    id: 'brilliant-flash',
    name: 'Flash of Brilliance',
    flavorText: 'Lightning strikes! A move that shakes the very stones!',
    description: 'Play a brilliant move.',
    trigger: { type: 'brilliant_moves', count: 1 },
    rarity: 'rare',
    iconKey: '⚡',
    xpReward: 250,
  },

  // Library (Knowledge)
  {
    id: 'oracle-sight',
    name: 'Oracle\'s Sight',
    flavorText: 'You see not just moves, but souls...',
    description: 'Achieve a 5-prediction streak.',
    trigger: { type: 'prediction_streak', count: 5 },
    rarity: 'rare',
    iconKey: '🔮',
    xpReward: 300,
    roomUnlock: 'library',
  },
  {
    id: 'scholar-path',
    name: 'The Scholar\'s Path',
    flavorText: 'Knowledge is the truest weapon.',
    description: 'Complete 10 games with over 80% accuracy.',
    trigger: { type: 'accuracy_threshold', percentage: 80 },
    rarity: 'rare',
    iconKey: '📚',
    xpReward: 350,
  },

  // Chapel (Resilience)
  {
    id: 'phoenix-rise',
    name: 'Rise of the Phoenix',
    flavorText: 'From ashes to glory! The spirits sing!',
    description: 'Win a game after being down 3+ pawns.',
    trigger: { type: 'comeback_win', evalThreshold: 300 },
    rarity: 'epic',
    iconKey: '🔥',
    xpReward: 500,
    roomUnlock: 'chapel',
  },
  {
    id: 'unbreakable',
    name: 'The Unbreakable Will',
    flavorText: 'Neither mistake nor misfortune sways this warrior.',
    description: 'Complete a game with no blunders or mistakes.',
    trigger: { type: 'perfect_game', noBlunders: true, noMistakes: true },
    rarity: 'epic',
    iconKey: '🛡️',
    xpReward: 600,
  },

  // Throne Room (Mastery)
  {
    id: 'grandmaster-whisper',
    name: 'The Grandmaster\'s Whisper',
    flavorText: 'The ancient masters acknowledge your presence...',
    description: 'Reach 1800 rating.',
    trigger: { type: 'rating_reached', rating: 1800 },
    rarity: 'legendary',
    iconKey: '👑',
    xpReward: 1000,
    roomUnlock: 'throne_room',
  },
  {
    id: 'castle-lord',
    name: 'Lord of the Cursed Castle',
    flavorText: 'The curse lifts. The castle is yours.',
    description: 'Unlock all castle rooms and collect all achievements.',
    trigger: { type: 'games_played', count: 100 },
    rarity: 'legendary',
    iconKey: '🏰',
    xpReward: 2000,
  },
];

export default CASTLE_ACHIEVEMENTS;











