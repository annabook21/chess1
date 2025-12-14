/**
 * ChessBoard Component
 * Premium styled chess board with visual enhancements
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
  // Highlight squares for selected choice
  const getSquareStyles = () => {
    const styles: Record<string, React.CSSProperties> = {};
    
    if (selectedChoice && choices) {
      const choice = choices.find(c => c.id === selectedChoice);
      if (choice && choice.moveUci.length >= 4) {
        const from = choice.moveUci.slice(0, 2);
        const to = choice.moveUci.slice(2, 4);
        
        styles[from] = {
          background: 'radial-gradient(circle at center, rgba(212, 175, 55, 0.6) 0%, rgba(212, 175, 55, 0.2) 70%, transparent 100%)',
        };
        
        styles[to] = {
          background: 'radial-gradient(circle at center, rgba(16, 185, 129, 0.6) 0%, rgba(16, 185, 129, 0.2) 70%, transparent 100%)',
          boxShadow: 'inset 0 0 20px rgba(16, 185, 129, 0.4)',
        };
      }
    }
    
    return styles;
  };

  return (
    <div className="chess-board-wrapper">
      <div className="chess-board-container">
        <Chessboard
          position={fen}
          width={440}
          draggable={false}
          squareStyles={getSquareStyles()}
          lightSquareStyle={{
            background: 'linear-gradient(135deg, #e8dcc4 0%, #d4c4a8 100%)',
          }}
          darkSquareStyle={{
            background: 'linear-gradient(135deg, #8b7355 0%, #6d5a42 100%)',
          }}
          boardStyle={{
            borderRadius: '12px',
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.6), 0 0 0 8px rgba(26, 26, 37, 0.9)',
          }}
        />
        
        {/* Board frame decoration */}
        <div className="board-frame-top" />
        <div className="board-frame-bottom" />
      </div>
      
      {/* Turn indicator */}
      <div className="turn-indicator">
        <span className={`turn-dot ${fen.includes(' w ') ? 'white' : 'black'}`} />
        <span className="turn-text">
          {fen.includes(' w ') ? 'White to move' : 'Black to move'}
        </span>
      </div>
    </div>
  );
};
