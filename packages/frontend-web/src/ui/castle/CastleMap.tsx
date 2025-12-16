/**
 * Castle Map
 * SVG-based room progression map with unlock states
 * Uses CSS pixel sprites for authentic retro look
 */

import React, { useMemo } from 'react';
import './CastleMap.css';
import './PixelSprites.css';

// Room definitions from rooms.json
interface Room {
  id: string;
  name: string;
  description: string;
  icon: string;
  order: number;
  unlocked: boolean;
  completed?: boolean;
  progress?: number; // 0-100
}

interface CastleMapProps {
  rooms: Room[];
  currentRoomId?: string;
  onRoomSelect?: (roomId: string) => void;
  playerRating?: number;
}

// SVG coordinates for each room (hexagonal layout)
const ROOM_POSITIONS: Record<string, { x: number; y: number }> = {
  courtyard: { x: 200, y: 320 },
  armory: { x: 100, y: 220 },
  library: { x: 300, y: 220 },
  chapel: { x: 100, y: 120 },
  crypt: { x: 300, y: 120 },
  throne_room: { x: 200, y: 40 },
};

// Connection paths between rooms
const CONNECTIONS: Array<[string, string]> = [
  ['courtyard', 'armory'],
  ['courtyard', 'library'],
  ['armory', 'chapel'],
  ['library', 'crypt'],
  ['chapel', 'throne_room'],
  ['crypt', 'throne_room'],
];

export const CastleMap: React.FC<CastleMapProps> = ({
  rooms,
  currentRoomId,
  onRoomSelect,
  playerRating = 1200,
}) => {
  // Create room lookup map
  const roomMap = useMemo(() => {
    const map = new Map<string, Room>();
    rooms.forEach(r => map.set(r.id, r));
    return map;
  }, [rooms]);

  // Render connection line between two rooms
  const renderConnection = (from: string, to: string, index: number) => {
    const fromPos = ROOM_POSITIONS[from];
    const toPos = ROOM_POSITIONS[to];
    if (!fromPos || !toPos) return null;

    const fromRoom = roomMap.get(from);
    const toRoom = roomMap.get(to);
    const isActive = fromRoom?.unlocked && toRoom?.unlocked;
    const isPartial = fromRoom?.unlocked && !toRoom?.unlocked;

    return (
      <line
        key={`conn-${index}`}
        x1={fromPos.x}
        y1={fromPos.y}
        x2={toPos.x}
        y2={toPos.y}
        className={`map-connection ${isActive ? 'active' : ''} ${isPartial ? 'partial' : ''}`}
        strokeDasharray={isPartial ? '8,4' : undefined}
      />
    );
  };

  // Render a room node
  const renderRoom = (room: Room) => {
    const pos = ROOM_POSITIONS[room.id];
    if (!pos) return null;

    const isCurrent = room.id === currentRoomId;
    const isLocked = !room.unlocked;

    return (
      <g
        key={room.id}
        className={`map-room ${isCurrent ? 'current' : ''} ${isLocked ? 'locked' : ''} ${room.completed ? 'completed' : ''}`}
        transform={`translate(${pos.x}, ${pos.y})`}
        onClick={() => !isLocked && onRoomSelect?.(room.id)}
        style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
      >
        {/* Glow effect for current room */}
        {isCurrent && (
          <circle
            r="45"
            className="room-glow"
          />
        )}

        {/* Room background */}
        <circle
          r="35"
          className="room-bg"
        />

        {/* Progress ring */}
        {room.progress !== undefined && room.progress > 0 && (
          <circle
            r="35"
            className="room-progress"
            strokeDasharray={`${(room.progress / 100) * 220} 220`}
            transform="rotate(-90)"
          />
        )}

        {/* Room border */}
        <circle
          r="35"
          className="room-border"
        />

        {/* Room icon */}
        <text
          className="room-icon"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="24"
        >
          {isLocked ? '🔒' : room.icon}
        </text>

        {/* Completed checkmark */}
        {room.completed && (
          <circle
            cx="25"
            cy="-25"
            r="10"
            className="room-check-bg"
          />
        )}
        {room.completed && (
          <text
            x="25"
            y="-25"
            className="room-check"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="12"
          >
            ✓
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="castle-map-container">
      <div className="castle-map-header">
        <h2 className="castle-map-title">🏰 The Cursed Castle</h2>
        <span className="castle-map-rating">Guild Rank: {playerRating}</span>
      </div>

      <svg
        className="castle-map-svg"
        viewBox="0 0 400 380"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background decorations */}
        <defs>
          <radialGradient id="room-glow-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--castle-accent2)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--castle-accent2)" stopOpacity="0" />
          </radialGradient>
          
          <filter id="room-shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Castle outline (decorative) */}
        <path
          className="castle-outline"
          d="M200,10 L350,80 L350,350 L50,350 L50,80 Z"
          fill="none"
          strokeDasharray="4,8"
        />

        {/* Connections */}
        <g className="connections">
          {CONNECTIONS.map(([from, to], i) => renderConnection(from, to, i))}
        </g>

        {/* Rooms */}
        <g className="rooms">
          {rooms.map(renderRoom)}
        </g>
      </svg>

      {/* Room details panel */}
      {currentRoomId && roomMap.get(currentRoomId) && (
        <div className="castle-map-details">
          <div className="room-detail-icon">
            {roomMap.get(currentRoomId)!.icon}
          </div>
          <div className="room-detail-info">
            <h3>{roomMap.get(currentRoomId)!.name}</h3>
            <p>{roomMap.get(currentRoomId)!.description}</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="castle-map-legend">
        <span className="legend-item">
          <span className="legend-dot unlocked"></span> Unlocked
        </span>
        <span className="legend-item">
          <span className="legend-dot locked"></span> Locked
        </span>
        <span className="legend-item">
          <span className="legend-dot current"></span> Current
        </span>
      </div>
    </div>
  );
};

export default CastleMap;

// Default rooms based on rooms.json
export const DEFAULT_ROOMS: Room[] = [
  {
    id: 'courtyard',
    name: 'The Courtyard',
    description: 'Where all journeys begin. Learn the basics of piece movement and simple tactics.',
    icon: '🏛️',
    order: 1,
    unlocked: true,
  },
  {
    id: 'armory',
    name: 'The Armory',
    description: 'Sharpen your tactical blade. Forks, pins, skewers, and discovered attacks await.',
    icon: '⚔️',
    order: 2,
    unlocked: false,
  },
  {
    id: 'library',
    name: 'The Library',
    description: 'Ancient scrolls reveal opening theory and strategic planning.',
    icon: '📚',
    order: 3,
    unlocked: false,
  },
  {
    id: 'chapel',
    name: 'The Chapel',
    description: 'Find inner strength. Learn to defend, counterattack, and never give up.',
    icon: '⛪',
    order: 4,
    unlocked: false,
  },
  {
    id: 'crypt',
    name: 'The Crypt',
    description: 'Where games go to die... or be reborn. Master endgame technique.',
    icon: '💀',
    order: 5,
    unlocked: false,
  },
  {
    id: 'throne_room',
    name: 'The Throne Room',
    description: 'Only the worthy may enter. Face the ultimate challenges.',
    icon: '👑',
    order: 6,
    unlocked: false,
  },
];

