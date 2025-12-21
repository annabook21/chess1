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
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      setIsExpanded(false);
    }
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    currentY.current = e.touches[0].clientY;
    const diff = startY.current - currentY.current;
    
    if (diff > 50 && !isExpanded) {
      setIsExpanded(true);
    } else if (diff < -50 && isExpanded) {
      setIsExpanded(false);
    } else if (diff < -100 && !isExpanded) {
      onClose();
    }
  };

  const handleTouchEnd = () => {
    startY.current = 0;
    currentY.current = 0;
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className={`bottom-sheet-overlay ${isExpanded ? 'expanded' : ''}`}
        onClick={() => {
          if (isExpanded) {
            setIsExpanded(false);
          } else {
            onClose();
          }
        }}
      />
      <div
        ref={sheetRef}
        className={`bottom-sheet ${isExpanded ? 'expanded' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="bottom-sheet-handle" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="bottom-sheet-handle-bar" />
        </div>
        
        {title && (
          <div className="bottom-sheet-header">
            <h3 className="bottom-sheet-title">{title}</h3>
          </div>
        )}
        
        <div className="bottom-sheet-content">
          {children}
        </div>
      </div>
    </>
  );
};











