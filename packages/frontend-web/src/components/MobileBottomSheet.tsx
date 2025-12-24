/**
 * MobileBottomSheet Component
 * Expandable bottom sheet for move details on mobile
 */

import { useState, useRef, useEffect } from 'react';
import './MobileBottomSheet.css';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const lastTouchTime = useRef(0);
  const lastTouchY = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      setIsExpanded(false);
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      startY.current = 0;
      currentY.current = 0;
      lastTouchTime.current = 0;
      lastTouchY.current = 0;
    };
  }, []);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isExpanded) {
          setIsExpanded(false);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isExpanded, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    lastTouchTime.current = Date.now();
    lastTouchY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isTransitioning) return;

    const now = Date.now();
    const currentYPos = e.touches[0].clientY;
    currentY.current = currentYPos;

    // Calculate velocity (pixels per millisecond)
    const timeDelta = now - lastTouchTime.current;
    const yDelta = currentYPos - lastTouchY.current;
    const velocity = timeDelta > 0 ? yDelta / timeDelta : 0;

    lastTouchTime.current = now;
    lastTouchY.current = currentYPos;

    const diff = startY.current - currentYPos;

    // Prevent page scroll when actively gesturing
    if (Math.abs(diff) > 10) {
      e.preventDefault();
    }

    // Fast flick down (velocity > 1.5 px/ms) closes immediately
    if (velocity > 1.5 && isExpanded) {
      setIsTransitioning(true);
      onClose();
      setTimeout(() => setIsTransitioning(false), 300);
      return;
    }

    // Gesture-based state changes
    if (diff > 50 && !isExpanded) {
      // Swipe up when collapsed → expand
      setIsTransitioning(true);
      setIsExpanded(true);
      setTimeout(() => setIsTransitioning(false), 300);
    } else if (diff < -50 && diff > -150 && isExpanded) {
      // Small swipe down when expanded → collapse
      setIsTransitioning(true);
      setIsExpanded(false);
      setTimeout(() => setIsTransitioning(false), 300);
    } else if (diff < -150 && isExpanded) {
      // Large swipe down when expanded → close completely
      setIsTransitioning(true);
      onClose();
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const handleTouchEnd = () => {
    startY.current = 0;
    currentY.current = 0;
    lastTouchTime.current = 0;
    lastTouchY.current = 0;
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className={`bottom-sheet-overlay ${isExpanded ? 'expanded' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className={`bottom-sheet ${isExpanded ? 'expanded' : ''}`}
        role="dialog"
        aria-modal={isExpanded}
        aria-labelledby={title ? "bottom-sheet-title" : undefined}
        tabIndex={-1}
      >
        <div
          className="bottom-sheet-handle"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => setIsExpanded(!isExpanded)}
          role="button"
          aria-label={isExpanded ? "Collapse sheet" : "Expand sheet"}
        >
          <div className="bottom-sheet-handle-bar" />
        </div>

        {title && (
          <div className="bottom-sheet-header">
            <h3 id="bottom-sheet-title" className="bottom-sheet-title">{title}</h3>
          </div>
        )}

        <div className="bottom-sheet-content">
          {children}
        </div>
      </div>
    </>
  );
};












