/**
 * Day Streak Tracking Utility
 * Implements best practices for tracking daily activity streaks
 * Uses ISO 8601 date format (YYYY-MM-DD) for consistency
 */

const STREAK_STORAGE_KEY = 'masterAcademy_dayStreak';
const LAST_ACTIVITY_KEY = 'masterAcademy_lastActivityDate';

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 * Normalized to UTC midnight to avoid timezone issues
 */
function getTodayISO(): string {
  const today = new Date();
  // Use UTC to avoid timezone discrepancies
  const year = today.getUTCFullYear();
  const month = String(today.getUTCMonth() + 1).padStart(2, '0');
  const day = String(today.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse ISO date string to Date object
 */
function parseISODate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Calculate days difference between two ISO dates
 */
function daysDifference(date1Str: string, date2Str: string): number {
  const date1 = parseISODate(date1Str);
  const date2 = parseISODate(date2Str);
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get current day streak, updating it if necessary
 * Returns the current streak count
 */
export function getCurrentDayStreak(): number {
  const today = getTodayISO();
  const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY);
  const currentStreakStr = localStorage.getItem(STREAK_STORAGE_KEY);
  
  let currentStreak = currentStreakStr ? parseInt(currentStreakStr, 10) : 0;
  
  if (!lastActivityStr) {
    // First time - initialize streak
    currentStreak = 1;
    localStorage.setItem(STREAK_STORAGE_KEY, '1');
    localStorage.setItem(LAST_ACTIVITY_KEY, today);
    return 1;
  }
  
  if (lastActivityStr === today) {
    // Already updated today - return current streak
    return currentStreak;
  }
  
  // Calculate days since last activity
  const daysSince = daysDifference(lastActivityStr, today);
  
  if (daysSince === 1) {
    // Consecutive day - increment streak
    currentStreak += 1;
    localStorage.setItem(STREAK_STORAGE_KEY, String(currentStreak));
    localStorage.setItem(LAST_ACTIVITY_KEY, today);
  } else if (daysSince > 1) {
    // Streak broken - reset to 1
    currentStreak = 1;
    localStorage.setItem(STREAK_STORAGE_KEY, '1');
    localStorage.setItem(LAST_ACTIVITY_KEY, today);
  }
  // daysSince === 0 shouldn't happen, but if it does, return current streak
  
  return currentStreak;
}

/**
 * Update day streak (call when user completes an activity)
 * Returns the updated streak count
 */
export function updateDayStreak(): number {
  return getCurrentDayStreak();
}

/**
 * Get streak data without updating
 * Useful for display purposes
 */
export function getStreakData(): { streak: number; lastActivity: string | null } {
  const streakStr = localStorage.getItem(STREAK_STORAGE_KEY);
  const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
  
  return {
    streak: streakStr ? parseInt(streakStr, 10) : 0,
    lastActivity,
  };
}









