/**
 * Spirit Whisper Window
 * Displays narration with typewriter effect in castle theme
 */

import React, { useState, useEffect, useRef } from 'react';
import { TypewriterController } from '../../narration/render/typewriter';
import { SpiritPortrait, severityToMood } from './SpiritPortrait';
import './SpiritWhisper.css';

interface SpiritWhisperProps {
  text: string;
  severity?: 'neutral' | 'good' | 'great' | 'bad' | 'terrible';
  typewriterSpeed?: number;
  showPortrait?: boolean;
  onComplete?: () => void;
}

export const SpiritWhisper: React.FC<SpiritWhisperProps> = ({
  text,
  severity = 'neutral',
  typewriterSpeed = 30,
  showPortrait = true,
  onComplete,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const controllerRef = useRef<TypewriterController | null>(null);
  const previousTextRef = useRef(text);

  useEffect(() => {
    // Skip if same text
    if (text === previousTextRef.current && displayedText === text) {
      return;
    }
    previousTextRef.current = text;

    // Cancel any running animation
    controllerRef.current?.cancel();
    controllerRef.current = new TypewriterController();
    setIsComplete(false);

    controllerRef.current.run(
      text,
      setDisplayedText,
      { 
        speed: typewriterSpeed,
        pauseOnPunctuation: true,
        punctuationDelay: 100,
      }
    ).then((completed) => {
      setIsComplete(completed);
      if (completed) onComplete?.();
    });

    return () => {
      controllerRef.current?.cancel();
    };
  }, [text, typewriterSpeed, onComplete]);

  const handleClick = () => {
    if (!isComplete) {
      controllerRef.current?.cancel();
      setDisplayedText(text);
      setIsComplete(true);
      onComplete?.();
    }
  };

  return (
    <div 
      className={`spirit-whisper spirit-whisper--${severity}`}
      onClick={handleClick}
    >
      {/* Stone frame border */}
      <div className="spirit-whisper__frame">
        {/* Spirit portrait with mood expressions */}
        {showPortrait && (
          <SpiritPortrait 
            mood={severityToMood(severity)} 
            size="medium"
            animated={true}
          />
        )}
        
        {/* Text area */}
        <div className="spirit-whisper__content">
          <div className="spirit-whisper__text">
            {displayedText}
            {!isComplete && <span className="spirit-whisper__cursor">▌</span>}
          </div>
        </div>
        
        {/* Continue indicator */}
        {isComplete && (
          <div className="spirit-whisper__continue">
            ▼
          </div>
        )}
      </div>
    </div>
  );
};

export default SpiritWhisper;



