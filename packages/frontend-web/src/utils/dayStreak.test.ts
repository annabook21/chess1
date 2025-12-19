/**
 * Day Streak Utility Tests
 * 
 * Tests streak tracking logic based on the actual implementation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCurrentDayStreak, updateDayStreak, getStreakData } from './dayStreak';

const STREAK_STORAGE_KEY = 'masterAcademy_dayStreak';
const LAST_ACTIVITY_KEY = 'masterAcademy_lastActivityDate';

describe('dayStreak', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getCurrentDayStreak', () => {
    it('should return 1 and initialize on first call', () => {
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));

      const streak = getCurrentDayStreak();

      expect(streak).toBe(1);
      expect(localStorage.getItem(STREAK_STORAGE_KEY)).toBe('1');
      expect(localStorage.getItem(LAST_ACTIVITY_KEY)).toBe('2025-01-15');
    });

    it('should return same streak if called again same day', () => {
      vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));
      getCurrentDayStreak(); // Initialize

      vi.setSystemTime(new Date('2025-01-15T18:00:00Z'));
      const streak = getCurrentDayStreak();

      expect(streak).toBe(1);
    });

    it('should increment streak on consecutive day', () => {
      // Day 1
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
      getCurrentDayStreak();

      // Day 2 (next day)
      vi.setSystemTime(new Date('2025-01-16T12:00:00Z'));
      const streak = getCurrentDayStreak();

      expect(streak).toBe(2);
    });

    it('should reset streak after missing a day', () => {
      // Day 1
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
      getCurrentDayStreak();

      // Day 2
      vi.setSystemTime(new Date('2025-01-16T12:00:00Z'));
      getCurrentDayStreak();

      // Skip Day 3, come back Day 4
      vi.setSystemTime(new Date('2025-01-18T12:00:00Z'));
      const streak = getCurrentDayStreak();

      expect(streak).toBe(1); // Reset
    });

    it('should build multi-day streak correctly', () => {
      // Build a 5-day streak
      for (let day = 15; day <= 19; day++) {
        vi.setSystemTime(new Date(`2025-01-${day}T12:00:00Z`));
        getCurrentDayStreak();
      }

      expect(getCurrentDayStreak()).toBe(5);
    });

    it('should handle month boundaries', () => {
      // January 31
      vi.setSystemTime(new Date('2025-01-31T12:00:00Z'));
      getCurrentDayStreak();

      // February 1
      vi.setSystemTime(new Date('2025-02-01T12:00:00Z'));
      const streak = getCurrentDayStreak();

      expect(streak).toBe(2);
    });

    it('should handle year boundaries', () => {
      // December 31
      vi.setSystemTime(new Date('2024-12-31T12:00:00Z'));
      getCurrentDayStreak();

      // January 1
      vi.setSystemTime(new Date('2025-01-01T12:00:00Z'));
      const streak = getCurrentDayStreak();

      expect(streak).toBe(2);
    });
  });

  describe('updateDayStreak', () => {
    it('should return same value as getCurrentDayStreak', () => {
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));

      const getResult = getCurrentDayStreak();
      
      vi.setSystemTime(new Date('2025-01-16T12:00:00Z'));
      const updateResult = updateDayStreak();

      expect(updateResult).toBe(2);
    });
  });

  describe('getStreakData', () => {
    it('should return streak 0 and null lastActivity when no data', () => {
      const data = getStreakData();

      expect(data.streak).toBe(0);
      expect(data.lastActivity).toBeNull();
    });

    it('should return stored streak and lastActivity', () => {
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
      getCurrentDayStreak();

      vi.setSystemTime(new Date('2025-01-16T12:00:00Z'));
      getCurrentDayStreak();

      const data = getStreakData();

      expect(data.streak).toBe(2);
      expect(data.lastActivity).toBe('2025-01-16');
    });

    it('should not modify streak when called', () => {
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
      getCurrentDayStreak();

      const before = getStreakData();

      // Call multiple times
      getStreakData();
      getStreakData();

      const after = getStreakData();

      expect(before.streak).toBe(after.streak);
      expect(before.lastActivity).toBe(after.lastActivity);
    });
  });

  describe('timezone handling', () => {
    it('should use UTC dates to avoid timezone issues', () => {
      // Set time at 11 PM UTC (could be next day in some timezones)
      vi.setSystemTime(new Date('2025-01-15T23:00:00Z'));
      getCurrentDayStreak();

      // Same UTC day but 1 hour later
      vi.setSystemTime(new Date('2025-01-15T23:59:00Z'));
      const streak = getCurrentDayStreak();

      expect(streak).toBe(1); // Still same day
    });
  });
});

