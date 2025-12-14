/**
 * Chess Board Component
 */

import React from 'react';
import { Chessboard } from 'chessboardjsx';
import { TurnPackage, MoveChoice } from '@master-academy/contracts';

interface ChessBoardProps {
  fen: string;
  onMove?: (move: string) => void;
  choices?: MoveChoice[];
  selectedChoice?: string | null;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  fen,
  onMove,
  choices,
  selectedChoice,
}) => {
  const handleSquareClick = (square: string) => {
    // Simple implementation - in production, handle piece selection
    if (onMove && choices && selectedChoice) {
      const choice = choices.find(c => c.id === selectedChoice);
      if (choice) {
        onMove(choice.moveUci);
      }
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
      <Chessboard
        position={fen}
        onSquareClick={handleSquareClick}
        width={400}
        boardStyle={{
          borderRadius: '5px',
          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
        }}
      />
    </div>
  );
};

