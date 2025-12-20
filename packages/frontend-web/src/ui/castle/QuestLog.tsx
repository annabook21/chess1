/**
 * Quest Log
 * Quest for Glory-style quest tracking system
 * Shows current objectives, completed quests, and story progression
 */

import React, { useState } from 'react';
import './QuestLog.css';

export interface Quest {
  id: string;
  title: string;
  description: string;
  objectives: QuestObjective[];
  rewards: QuestReward[];
  roomId: string;
  chapter: number;
  status: 'locked' | 'available' | 'active' | 'completed';
  storyText?: string; // Narrative text when quest is completed
}

export interface QuestObjective {
  id: string;
  text: string;
  type: 'games' | 'accuracy' | 'tactics' | 'rating' | 'streak' | 'moves';
  target: number;
  current: number;
  completed: boolean;
}

export interface QuestReward {
  type: 'xp' | 'room_unlock' | 'title' | 'achievement';
  value: string | number;
  label: string;
}

interface QuestLogProps {
  quests: Quest[];
  activeQuestId?: string;
  onQuestSelect?: (questId: string) => void;
  onQuestActivate?: (questId: string) => void;
}

export const QuestLog: React.FC<QuestLogProps> = ({
  quests,
  activeQuestId,
  onQuestSelect,
  onQuestActivate,
}) => {
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(
    activeQuestId || null
  );

  const selectedQuest = quests.find(q => q.id === selectedQuestId);
  
  const activeQuests = quests.filter(q => q.status === 'active');
  const availableQuests = quests.filter(q => q.status === 'available');
  const completedQuests = quests.filter(q => q.status === 'completed');

  const handleQuestClick = (questId: string) => {
    setSelectedQuestId(questId);
    onQuestSelect?.(questId);
  };

  const getStatusIcon = (status: Quest['status']) => {
    switch (status) {
      case 'completed': return '✓';
      case 'active': return '►';
      case 'available': return '○';
      case 'locked': return '🔒';
    }
  };

  const renderQuestList = (questList: Quest[], title: string) => {
    if (questList.length === 0) return null;
    
    return (
      <div className="quest-list-section">
        <h4 className="quest-list-title">{title}</h4>
        <ul className="quest-list">
          {questList.map(quest => (
            <li
              key={quest.id}
              className={`quest-item quest-item--${quest.status} ${
                selectedQuestId === quest.id ? 'selected' : ''
              }`}
              onClick={() => handleQuestClick(quest.id)}
            >
              <span className="quest-status">{getStatusIcon(quest.status)}</span>
              <span className="quest-title">{quest.title}</span>
              <span className="quest-chapter">Ch.{quest.chapter}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="quest-log">
      <div className="quest-log__header">
        <h2 className="quest-log__title">Quest Log</h2>
        <span className="quest-log__subtitle">Your Journey Through the Castle</span>
      </div>

      <div className="quest-log__content">
        {/* Quest List */}
        <div className="quest-log__list">
          {renderQuestList(activeQuests, 'Active Quests')}
          {renderQuestList(availableQuests, 'Available Quests')}
          {renderQuestList(completedQuests, 'Completed')}
        </div>

        {/* Quest Details */}
        <div className="quest-log__details">
          {selectedQuest ? (
            <>
              <div className="quest-details__header">
                <h3 className="quest-details__title">{selectedQuest.title}</h3>
                <span className={`quest-details__status quest-details__status--${selectedQuest.status}`}>
                  {selectedQuest.status}
                </span>
              </div>

              <p className="quest-details__description">
                {selectedQuest.description}
              </p>

              {/* Objectives */}
              <div className="quest-details__objectives">
                <h4>Objectives</h4>
                <ul>
                  {selectedQuest.objectives.map(obj => (
                    <li 
                      key={obj.id}
                      className={`objective ${obj.completed ? 'completed' : ''}`}
                    >
                      <span className="objective-check">
                        {obj.completed ? '☑' : '☐'}
                      </span>
                      <span className="objective-text">{obj.text}</span>
                      <span className="objective-progress">
                        {obj.current}/{obj.target}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Rewards */}
              <div className="quest-details__rewards">
                <h4>Rewards</h4>
                <div className="rewards-list">
                  {selectedQuest.rewards.map((reward, idx) => (
                    <span key={idx} className={`reward reward--${reward.type}`}>
                      {reward.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Story text for completed quests */}
              {selectedQuest.status === 'completed' && selectedQuest.storyText && (
                <div className="quest-details__story">
                  <p>{selectedQuest.storyText}</p>
                </div>
              )}

              {/* Action button */}
              {selectedQuest.status === 'available' && (
                <button
                  className="quest-details__activate"
                  onClick={() => onQuestActivate?.(selectedQuest.id)}
                >
                  Begin Quest
                </button>
              )}
            </>
          ) : (
            <div className="quest-details__empty">
              <p>Select a quest to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestLog;

// Default quests for the Cursed Castle storyline
export const CASTLE_QUESTS: Quest[] = [
  {
    id: 'awakening',
    title: 'The Awakening',
    description: 'You have arrived at the Cursed Castle. The Spirit senses your presence and calls out to guide you. Complete your first game to prove your worth.',
    chapter: 1,
    roomId: 'courtyard',
    status: 'available',
    objectives: [
      { id: 'first-game', text: 'Complete your first game', type: 'games', target: 1, current: 0, completed: false },
    ],
    rewards: [
      { type: 'xp', value: 100, label: '+100 XP' },
      { type: 'title', value: 'Novice', label: 'Title: Novice' },
    ],
    storyText: 'The Spirit nods approvingly. "You have taken your first steps on the path of mastery. But the journey has only begun..."',
  },
  {
    id: 'basics',
    title: 'Fundamentals of Battle',
    description: 'The Spirit teaches you the basics of tactical combat. Learn to recognize good moves from bad.',
    chapter: 1,
    roomId: 'courtyard',
    status: 'locked',
    objectives: [
      { id: 'games-5', text: 'Complete 5 games', type: 'games', target: 5, current: 0, completed: false },
      { id: 'accuracy-50', text: 'Achieve 50% accuracy', type: 'accuracy', target: 50, current: 0, completed: false },
    ],
    rewards: [
      { type: 'xp', value: 200, label: '+200 XP' },
      { type: 'room_unlock', value: 'armory', label: 'Unlock: The Armory' },
    ],
    storyText: 'The gates to the Armory creak open. "Your foundation is solid," the Spirit intones. "Now we shall sharpen your blade."',
  },
  {
    id: 'tactical-vision',
    title: 'The Tactical Eye',
    description: 'In the Armory, ancient weapons whisper secrets of attack. Learn to spot tactics before your opponent.',
    chapter: 2,
    roomId: 'armory',
    status: 'locked',
    objectives: [
      { id: 'tactics-10', text: 'Find 10 tactical opportunities', type: 'tactics', target: 10, current: 0, completed: false },
      { id: 'good-moves-20', text: 'Play 20 good moves', type: 'moves', target: 20, current: 0, completed: false },
    ],
    rewards: [
      { type: 'xp', value: 300, label: '+300 XP' },
      { type: 'achievement', value: 'tactical-eye', label: 'Achievement: Tactical Eye' },
    ],
    storyText: 'The Spirit seems pleased. "You begin to see the battlefield clearly. The Library holds deeper wisdom..."',
  },
  {
    id: 'strategic-mind',
    title: 'Wisdom of the Ancients',
    description: 'The dusty tomes of the Library contain centuries of chess knowledge. Study the openings and strategic plans.',
    chapter: 2,
    roomId: 'library',
    status: 'locked',
    objectives: [
      { id: 'rating-1300', text: 'Reach 1300 rating', type: 'rating', target: 1300, current: 1200, completed: false },
      { id: 'streak-5', text: 'Win 5 games in a row', type: 'streak', target: 5, current: 0, completed: false },
    ],
    rewards: [
      { type: 'xp', value: 400, label: '+400 XP' },
      { type: 'room_unlock', value: 'chapel', label: 'Unlock: The Chapel' },
      { type: 'title', value: 'Scholar', label: 'Title: Scholar' },
    ],
    storyText: 'Ancient knowledge flows through you. The Spirit guides you deeper into the castle...',
  },
  {
    id: 'inner-strength',
    title: 'The Resilient Spirit',
    description: 'In the Chapel, learn to find hope in lost positions. Defense and counterattack are your salvation.',
    chapter: 3,
    roomId: 'chapel',
    status: 'locked',
    objectives: [
      { id: 'comebacks-3', text: 'Win 3 games from losing positions', type: 'games', target: 3, current: 0, completed: false },
      { id: 'no-blunders', text: 'Play 10 games without blundering', type: 'games', target: 10, current: 0, completed: false },
    ],
    rewards: [
      { type: 'xp', value: 500, label: '+500 XP' },
      { type: 'room_unlock', value: 'crypt', label: 'Unlock: The Crypt' },
    ],
  },
  {
    id: 'final-lessons',
    title: 'Mastery of the Endgame',
    description: 'The Crypt holds the final secrets. Master the endgame to earn your place in the Throne Room.',
    chapter: 3,
    roomId: 'crypt',
    status: 'locked',
    objectives: [
      { id: 'rating-1500', text: 'Reach 1500 rating', type: 'rating', target: 1500, current: 1200, completed: false },
      { id: 'accuracy-70', text: 'Achieve 70% accuracy', type: 'accuracy', target: 70, current: 0, completed: false },
    ],
    rewards: [
      { type: 'xp', value: 750, label: '+750 XP' },
      { type: 'room_unlock', value: 'throne_room', label: 'Unlock: The Throne Room' },
      { type: 'title', value: 'Master', label: 'Title: Master' },
    ],
  },
  {
    id: 'throne-challenge',
    title: 'The Final Challenge',
    description: 'You stand before the throne. Only the worthy may claim victory over the Cursed Castle.',
    chapter: 4,
    roomId: 'throne_room',
    status: 'locked',
    objectives: [
      { id: 'rating-1700', text: 'Reach 1700 rating', type: 'rating', target: 1700, current: 1200, completed: false },
      { id: 'perfect-game', text: 'Play a perfect game (100% accuracy)', type: 'accuracy', target: 100, current: 0, completed: false },
    ],
    rewards: [
      { type: 'xp', value: 1000, label: '+1000 XP' },
      { type: 'title', value: 'Champion', label: 'Title: Castle Champion' },
      { type: 'achievement', value: 'castle-champion', label: 'Achievement: Castle Champion' },
    ],
    storyText: 'The curse is lifted. You have become a true master of the castle. The Spirit bows before you...',
  },
];







