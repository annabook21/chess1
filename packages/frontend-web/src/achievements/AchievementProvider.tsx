/**
 * Achievement Provider Context
 * Wraps the app to provide achievement tracking throughout
 */

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useAchievements, UseAchievementsReturn } from './useAchievements';
import { CASTLE_ACHIEVEMENTS } from './castleAchievements';
import { Achievement, AchievementEvent, AchievementProgress } from './types';

// Extended context with achievement definitions
interface AchievementContextValue extends UseAchievementsReturn {
  /** Full achievement definitions */
  achievements: Achievement[];
  
  /** Get achievement definition by ID */
  getAchievement: (id: string) => Achievement | undefined;
  
  /** Get achievements that unlock a specific room */
  getUnlockedRooms: () => string[];
  
  /** Track multiple events at once */
  trackEvents: (events: AchievementEvent[]) => AchievementProgress[];
}

const AchievementContext = createContext<AchievementContextValue | null>(null);

interface AchievementProviderProps {
  children: React.ReactNode;
  /** Optional: override default achievements for testing */
  achievements?: Achievement[];
  /** Callback when achievement is unlocked */
  onAchievementUnlocked?: (achievement: Achievement, progress: AchievementProgress) => void;
}

export const AchievementProvider: React.FC<AchievementProviderProps> = ({
  children,
  achievements = CASTLE_ACHIEVEMENTS,
  onAchievementUnlocked,
}) => {
  const hook = useAchievements(achievements);

  // Get achievement definition by ID
  const getAchievement = useCallback((id: string): Achievement | undefined => {
    return achievements.find(a => a.id === id);
  }, [achievements]);

  // Get all unlocked rooms based on completed achievements
  const getUnlockedRooms = useCallback((): string[] => {
    const unlockedRooms = new Set<string>();
    
    // Courtyard is always unlocked
    unlockedRooms.add('courtyard');
    
    // Check each completed achievement for room unlocks
    for (const progress of hook.completedAchievements) {
      const achievement = achievements.find(a => a.id === progress.achievementId);
      if (achievement?.roomUnlock) {
        unlockedRooms.add(achievement.roomUnlock);
      }
    }
    
    return Array.from(unlockedRooms);
  }, [hook.completedAchievements, achievements]);

  // Track event with callback for newly unlocked
  const trackEventWithCallback = useCallback((event: AchievementEvent): AchievementProgress[] => {
    const newlyCompleted = hook.trackEvent(event);
    
    // Fire callback for each newly completed achievement
    if (onAchievementUnlocked) {
      for (const progress of newlyCompleted) {
        const achievement = achievements.find(a => a.id === progress.achievementId);
        if (achievement) {
          onAchievementUnlocked(achievement, progress);
        }
      }
    }
    
    return newlyCompleted;
  }, [hook, onAchievementUnlocked, achievements]);

  // Track multiple events at once
  const trackEvents = useCallback((events: AchievementEvent[]): AchievementProgress[] => {
    const allNewlyCompleted: AchievementProgress[] = [];
    
    for (const event of events) {
      const newlyCompleted = trackEventWithCallback(event);
      allNewlyCompleted.push(...newlyCompleted);
    }
    
    return allNewlyCompleted;
  }, [trackEventWithCallback]);

  const contextValue = useMemo((): AchievementContextValue => ({
    ...hook,
    trackEvent: trackEventWithCallback,
    achievements,
    getAchievement,
    getUnlockedRooms,
    trackEvents,
  }), [hook, trackEventWithCallback, achievements, getAchievement, getUnlockedRooms, trackEvents]);

  return (
    <AchievementContext.Provider value={contextValue}>
      {children}
    </AchievementContext.Provider>
  );
};

/** Hook to use achievement context */
export const useAchievementContext = (): AchievementContextValue => {
  const context = useContext(AchievementContext);
  if (!context) {
    throw new Error('useAchievementContext must be used within AchievementProvider');
  }
  return context;
};

export default AchievementProvider;

