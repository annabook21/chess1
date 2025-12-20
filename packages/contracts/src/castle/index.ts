/**
 * Castle Rooms Curriculum
 */

import roomsData from './rooms.json';

export interface RoomUnlockRequirement {
  type: 'default' | 'achievement' | 'rating' | 'games';
  unlockedByDefault?: boolean;
  achievementId?: string;
  minRating?: number;
  gamesRequired?: number;
}

export interface CastleRoom {
  id: string;
  name: string;
  description: string;
  icon: string;
  focusTags: string[];
  unlockRequirements: RoomUnlockRequirement;
  order: number;
}

export interface CastleRoomsConfig {
  rooms: CastleRoom[];
  metadata: {
    version: string;
    theme: string;
    totalRooms: number;
  };
}

export const CASTLE_ROOMS: CastleRoomsConfig = roomsData as CastleRoomsConfig;

export const getRoomById = (id: string): CastleRoom | undefined => {
  return CASTLE_ROOMS.rooms.find(room => room.id === id);
};

export const getUnlockedRooms = (
  playerAchievements: string[],
  playerRating: number,
  gamesPlayed: number
): CastleRoom[] => {
  return CASTLE_ROOMS.rooms.filter(room => {
    const req = room.unlockRequirements;
    
    switch (req.type) {
      case 'default':
        return req.unlockedByDefault;
      case 'achievement':
        return req.achievementId && playerAchievements.includes(req.achievementId);
      case 'rating':
        return req.minRating !== undefined && playerRating >= req.minRating;
      case 'games':
        return req.gamesRequired !== undefined && gamesPlayed >= req.gamesRequired;
      default:
        return false;
    }
  });
};

export const getNextLockedRoom = (
  playerAchievements: string[],
  playerRating: number,
  gamesPlayed: number
): CastleRoom | undefined => {
  const unlocked = getUnlockedRooms(playerAchievements, playerRating, gamesPlayed);
  const unlockedIds = new Set(unlocked.map(r => r.id));
  
  return CASTLE_ROOMS.rooms
    .sort((a, b) => a.order - b.order)
    .find(room => !unlockedIds.has(room.id));
};









