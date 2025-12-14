/**
 * ChessBoard Component
 * Clean, modern chess board
 */

import Chessboard from 'chessboardjsx';
import { MoveChoice } from '@master-academy/contracts';
import './ChessBoard.css';

interface ChessBoardProps {
  fen: string;
  onMove?: (move: string) => void;
  choices?: MoveChoice[];
  selectedChoice?: string | null;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  fen,
  choices,
  selectedChoice,
}) => {
  const getSquareStyles = () => {
    const styles: Record<string, React.CSSProperties> = {};
    
    if (selectedChoice && choices) {
      const choice = choices.find(c => c.id === selectedChoice);
      if (choice && choice.moveUci.length >= 4) {
        const from = choice.moveUci.slice(0, 2);
        const to = choice.moveUci.slice(2, 4);
        
        styles[from] = {
          background: 'rgba(232, 185, 35, 0.5)',
        };
        
        styles[to] = {
          background: 'rgba(34, 197, 94, 0.5)',
        };
      }
    }
    
    return styles;
  };

  const isWhiteToMove = fen.includes(' w ');

  return (
    <div className="chess-board-wrapper">
      <div className="chess-board-container">
        <Chessboard
          position={fen}
          width={440}
          draggable={false}
          squareStyles={getSquareStyles()}
          lightSquareStyle={{
            background: '#eeeed2',
          }}
          darkSquareStyle={{
            background: '#769656',
          }}
          boardStyle={{
            borderRadius: '4px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          }}
          transitionDuration={180}
        />
      </div>
      
      <div className={`turn-indicator ${isWhiteToMove ? 'white-turn' : 'black-turn'}`}>
        <span className="turn-piece">{isWhiteToMove ? '♔' : '♚'}</span>
        <span className="turn-text">
          {isWhiteToMove ? 'White to move' : 'Black to move'}
        </span>
        <div className="turn-pulse" />
      </div>
    </div>
  );
};
