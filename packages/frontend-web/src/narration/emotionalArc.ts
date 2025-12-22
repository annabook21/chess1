/**
 * Emotional Arc Tracking
 * Tracks the emotional trajectory of a game session
 * 
 * Based on research: Universal narrative structures (Rise, Fall, Rise-Fall)
 * map emotional patterns to enhance storytelling and engagement.
 */

/** Emotional state at a point in time */
export interface EmotionalPoint {
  moveNumber: number;
  evalDelta: number;
  severity: 'neutral' | 'good' | 'great' | 'bad' | 'terrible';
  emotionalValue: number; // -100 to +100
  timestamp: number;
}

/** Arc pattern detected */
export type ArcPattern = 
  | 'rising'        // Things are getting better
  | 'falling'       // Things are getting worse
  | 'stable'        // Consistent performance
  | 'volatile'      // Swinging back and forth
  | 'comeback'      // Was bad, now improving
  | 'collapse'      // Was good, now declining
  | 'triumph'       // Sustained excellence
  | 'struggle';     // Sustained difficulty

/** Game session emotional summary */
export interface EmotionalArc {
  points: EmotionalPoint[];
  currentPattern: ArcPattern;
  overallTrend: number; // -1 to +1
  momentum: number; // Recent trend, -1 to +1
  peakMoment?: EmotionalPoint;
  lowMoment?: EmotionalPoint;
  streakCount: number;
  streakType: 'positive' | 'negative' | 'neutral';
}

/** Convert severity to emotional value */
const severityToEmotionalValue = (
  severity: EmotionalPoint['severity']
): number => {
  switch (severity) {
    case 'great': return 80;
    case 'good': return 40;
    case 'neutral': return 0;
    case 'bad': return -40;
    case 'terrible': return -80;
  }
};

/** Create initial arc */
export const createEmotionalArc = (): EmotionalArc => ({
  points: [],
  currentPattern: 'stable',
  overallTrend: 0,
  momentum: 0,
  streakCount: 0,
  streakType: 'neutral',
});

/** Add a point to the arc */
export const addEmotionalPoint = (
  arc: EmotionalArc,
  moveNumber: number,
  evalDelta: number,
  severity: EmotionalPoint['severity']
): EmotionalArc => {
  const emotionalValue = severityToEmotionalValue(severity);
  
  const newPoint: EmotionalPoint = {
    moveNumber,
    evalDelta,
    severity,
    emotionalValue,
    timestamp: Date.now(),
  };
  
  const points = [...arc.points, newPoint];
  
  // Calculate new metrics
  const momentum = calculateMomentum(points);
  const overallTrend = calculateOverallTrend(points);
  const pattern = detectPattern(points, momentum, overallTrend);
  const { peakMoment, lowMoment } = findExtremes(points);
  const { streakCount, streakType } = calculateStreak(points);
  
  return {
    points,
    currentPattern: pattern,
    overallTrend,
    momentum,
    peakMoment,
    lowMoment,
    streakCount,
    streakType,
  };
};

/** Calculate recent momentum (last 3-5 moves) */
const calculateMomentum = (points: EmotionalPoint[]): number => {
  if (points.length < 2) return 0;
  
  const recentPoints = points.slice(-5);
  const firstHalf = recentPoints.slice(0, Math.ceil(recentPoints.length / 2));
  const secondHalf = recentPoints.slice(Math.floor(recentPoints.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, p) => sum + p.emotionalValue, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, p) => sum + p.emotionalValue, 0) / secondHalf.length;
  
  const diff = secondAvg - firstAvg;
  return Math.max(-1, Math.min(1, diff / 100));
};

/** Calculate overall trend across entire game */
const calculateOverallTrend = (points: EmotionalPoint[]): number => {
  if (points.length < 2) return 0;
  
  const firstThird = points.slice(0, Math.ceil(points.length / 3));
  const lastThird = points.slice(-Math.ceil(points.length / 3));
  
  const firstAvg = firstThird.reduce((sum, p) => sum + p.emotionalValue, 0) / firstThird.length;
  const lastAvg = lastThird.reduce((sum, p) => sum + p.emotionalValue, 0) / lastThird.length;
  
  const diff = lastAvg - firstAvg;
  return Math.max(-1, Math.min(1, diff / 100));
};

/** Detect the current arc pattern */
const detectPattern = (
  points: EmotionalPoint[],
  momentum: number,
  overallTrend: number
): ArcPattern => {
  if (points.length < 3) return 'stable';
  
  const recentPoints = points.slice(-5);
  const avgRecent = recentPoints.reduce((sum, p) => sum + p.emotionalValue, 0) / recentPoints.length;
  
  // Calculate variance for volatility
  const variance = recentPoints.reduce(
    (sum, p) => sum + Math.pow(p.emotionalValue - avgRecent, 2), 
    0
  ) / recentPoints.length;
  const volatility = Math.sqrt(variance);
  
  // High volatility = swinging
  if (volatility > 50) return 'volatile';
  
  // Sustained high performance
  if (avgRecent > 50 && momentum >= 0) return 'triumph';
  
  // Sustained low performance
  if (avgRecent < -50 && momentum <= 0) return 'struggle';
  
  // Comeback: was negative, now improving
  if (overallTrend < -0.2 && momentum > 0.3) return 'comeback';
  
  // Collapse: was positive, now declining
  if (overallTrend > 0.2 && momentum < -0.3) return 'collapse';
  
  // Simple rising/falling
  if (momentum > 0.2) return 'rising';
  if (momentum < -0.2) return 'falling';
  
  return 'stable';
};

/** Find peak and low moments */
const findExtremes = (points: EmotionalPoint[]): {
  peakMoment?: EmotionalPoint;
  lowMoment?: EmotionalPoint;
} => {
  if (points.length === 0) return {};
  
  let peak = points[0];
  let low = points[0];
  
  for (const point of points) {
    if (point.emotionalValue > peak.emotionalValue) peak = point;
    if (point.emotionalValue < low.emotionalValue) low = point;
  }
  
  return { 
    peakMoment: peak.emotionalValue > 0 ? peak : undefined,
    lowMoment: low.emotionalValue < 0 ? low : undefined,
  };
};

/** Calculate current streak */
const calculateStreak = (points: EmotionalPoint[]): {
  streakCount: number;
  streakType: 'positive' | 'negative' | 'neutral';
} => {
  if (points.length === 0) {
    return { streakCount: 0, streakType: 'neutral' };
  }
  
  const lastPoint = points[points.length - 1];
  let streakType: 'positive' | 'negative' | 'neutral' = 
    lastPoint.emotionalValue > 20 ? 'positive' :
    lastPoint.emotionalValue < -20 ? 'negative' : 'neutral';
  
  let count = 1;
  
  for (let i = points.length - 2; i >= 0; i--) {
    const point = points[i];
    const pointType = 
      point.emotionalValue > 20 ? 'positive' :
      point.emotionalValue < -20 ? 'negative' : 'neutral';
    
    if (pointType === streakType) {
      count++;
    } else {
      break;
    }
  }
  
  return { streakCount: count, streakType };
};

/** Get narrative modifier based on arc */
export const getArcNarrativeModifier = (arc: EmotionalArc): string => {
  switch (arc.currentPattern) {
    case 'comeback':
      return 'The tides are turning in your favor...';
    case 'collapse':
      return 'The shadows grow longer...';
    case 'triumph':
      return 'You move with the confidence of the castle\'s champions!';
    case 'struggle':
      return 'The trial tests your resolve...';
    case 'volatile':
      return 'Fortune swings like a pendulum in these halls...';
    case 'rising':
      return 'Your light grows stronger...';
    case 'falling':
      return 'Careful now, the path darkens...';
    default:
      return '';
  }
};

export default {
  createEmotionalArc,
  addEmotionalPoint,
  getArcNarrativeModifier,
};












