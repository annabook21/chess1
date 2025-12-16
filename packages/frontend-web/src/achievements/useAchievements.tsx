/**
 * Achievement System React Hook
 * Provides achievement tracking with localStorage persistence
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  Achievement,
  AchievementEvent, 
  PlayerStats, 
  AchievementProgress,
  AchievementStore,
  DEFAULT_PLAYER_STATS 
} from './types';
import { 
  createStore, 
  evaluateEvent, 
  applyUpdates,
  updateStats 
} from './evaluator';

const STORAGE_KEY = 'castle-achievements';

interface StoredData {
  stats: PlayerStats;
  completedIds: string[];
  progressMap: Record<string, AchievementProgress>;
}

/** Load store from localStorage */
const loadFromStorage = (achievements: Achievement[]): AchievementStore | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const data: StoredData = JSON.parse(stored);
    
    return {
      stats: { ...DEFAULT_PLAYER_STATS, ...data.stats },
      progress: new Map(Object.entries(data.progressMap)),
      completedIds: new Set(data.completedIds),
    };
  } catch {
    return null;
  }
};

/** Save store to localStorage */
const saveToStorage = (store: AchievementStore): void => {
  try {
    const data: StoredData = {
      stats: store.stats,
      completedIds: Array.from(store.completedIds),
      progressMap: Object.fromEntries(store.progress),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    console.warn('Failed to save achievements to localStorage');
  }
};

export interface UseAchievementsReturn {
  /** Current player stats */
  stats: PlayerStats;
  
  /** Progress for all achievements */
  allProgress: AchievementProgress[];
  
  /** Only completed achievements */
  completedAchievements: AchievementProgress[];
  
  /** Only in-progress achievements */
  inProgressAchievements: AchievementProgress[];
  
  /** Total XP earned */
  totalXp: number;
  
  /** Process a game event */
  trackEvent: (event: AchievementEvent) => AchievementProgress[];
  
  /** Get progress for specific achievement */
  getProgress: (achievementId: string) => AchievementProgress | undefined;
  
  /** Check if achievement is completed */
  isCompleted: (achievementId: string) => boolean;
  
  /** Reset all progress (for testing) */
  resetProgress: () => void;
}

export const useAchievements = (
  achievements: Achievement[]
): UseAchievementsReturn => {
  // Initialize store from localStorage or create new
  const [store, setStore] = useState<AchievementStore>(() => {
    const loaded = loadFromStorage(achievements);
    return loaded || createStore(achievements);
  });
  
  // Save to localStorage on changes
  useEffect(() => {
    saveToStorage(store);
  }, [store]);
  
  // Track an event and return newly completed achievements
  const trackEvent = useCallback((event: AchievementEvent): AchievementProgress[] => {
    let newlyCompleted: AchievementProgress[] = [];
    
    setStore(currentStore => {
      const result = evaluateEvent(event, achievements, currentStore);
      newlyCompleted = result.newlyCompleted;
      
      if (result.updatedProgress.length > 0) {
        const newStats = updateStats(currentStore.stats, event);
        return applyUpdates(currentStore, result, newStats);
      }
      
      return currentStore;
    });
    
    return newlyCompleted;
  }, [achievements]);
  
  // Get progress for specific achievement
  const getProgress = useCallback((achievementId: string): AchievementProgress | undefined => {
    return store.progress.get(achievementId);
  }, [store.progress]);
  
  // Check if completed
  const isCompleted = useCallback((achievementId: string): boolean => {
    return store.completedIds.has(achievementId);
  }, [store.completedIds]);
  
  // Reset all progress
  const resetProgress = useCallback(() => {
    setStore(createStore(achievements));
    localStorage.removeItem(STORAGE_KEY);
  }, [achievements]);
  
  // Derived values
  const allProgress = useMemo(() => 
    Array.from(store.progress.values()),
    [store.progress]
  );
  
  const completedAchievements = useMemo(() => 
    allProgress.filter(p => p.completed),
    [allProgress]
  );
  
  const inProgressAchievements = useMemo(() => 
    allProgress.filter(p => !p.completed && p.percentComplete > 0),
    [allProgress]
  );
  
  const totalXp = useMemo(() => {
    return completedAchievements.reduce((sum, prog) => {
      const achievement = achievements.find(a => a.id === prog.achievementId);
      return sum + (achievement?.xpReward || 0);
    }, 0);
  }, [completedAchievements, achievements]);
  
  return {
    stats: store.stats,
    allProgress,
    completedAchievements,
    inProgressAchievements,
    totalXp,
    trackEvent,
    getProgress,
    isCompleted,
    resetProgress,
  };
};

export default useAchievements;



