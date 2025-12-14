/**
 * ChessBoard Component
 * Premium 2025 styled chess board with wood textures and visual enhancements
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
        
        // "From" square - golden glow
        styles[from] = {
          background: 'radial-gradient(circle at center, rgba(212, 175, 55, 0.7) 0%, rgba(212, 175, 55, 0.3) 50%, transparent 100%)',
          boxShadow: 'inset 0 0 30px rgba(212, 175, 55, 0.5)',
        };
        
        // "To" square - emerald glow
        styles[to] = {
          background: 'radial-gradient(circle at center, rgba(16, 185, 129, 0.7) 0%, rgba(16, 185, 129, 0.3) 50%, transparent 100%)',
          boxShadow: 'inset 0 0 30px rgba(16, 185, 129, 0.5)',
        };
      }
    }
    
    return styles;
  };

  // Premium wood-grain light squares (maple)
  const lightSquareStyle = {
    background: `
      linear-gradient(135deg, #f0e4d0 0%, #e8dcc4 25%, #f0e4d0 50%, #e4d8c0 75%, #f0e4d0 100%),
      repeating-linear-gradient(
        90deg,
        transparent 0px,
        transparent 2px,
        rgba(139, 119, 101, 0.03) 2px,
        rgba(139, 119, 101, 0.03) 4px
      )
    `,
    backgroundBlendMode: 'multiply' as const,
  };

  // Premium wood-grain dark squares (walnut)
  const darkSquareStyle = {
    background: `
      linear-gradient(135deg, #8b7355 0%, #7a644a 25%, #8b7355 50%, #6d5a42 75%, #7a644a 100%),
      repeating-linear-gradient(
        90deg,
        transparent 0px,
        transparent 2px,
        rgba(0, 0, 0, 0.05) 2px,
        rgba(0, 0, 0, 0.05) 4px
      )
    `,
    backgroundBlendMode: 'multiply' as const,
  };

  // Board container styling with premium frame
  const boardStyle = {
    borderRadius: '8px',
    boxShadow: `
      0 40px 100px rgba(0, 0, 0, 0.7),
      0 20px 50px rgba(0, 0, 0, 0.5),
      inset 0 0 0 4px rgba(212, 175, 55, 0.15),
      0 0 0 8px #1a1a25,
      0 0 0 10px rgba(212, 175, 55, 0.2),
      0 0 60px rgba(212, 175, 55, 0.1)
    `,
  };

  const isWhiteToMove = fen.includes(' w ');

  return (
    <div className="chess-board-wrapper">
      {/* Ambient glow behind board */}
      <div className="board-ambient-glow" />
      
      <div className="chess-board-container">
        {/* Corner accents */}
        <div className="board-corner board-corner-tl" />
        <div className="board-corner board-corner-tr" />
        <div className="board-corner board-corner-bl" />
        <div className="board-corner board-corner-br" />
        
        <Chessboard
          position={fen}
          width={460}
          draggable={false}
          squareStyles={getSquareStyles()}
          lightSquareStyle={lightSquareStyle}
          darkSquareStyle={darkSquareStyle}
          boardStyle={boardStyle}
          transitionDuration={200}
        />
        
        {/* Gold accent lines */}
        <div className="board-frame-top" />
        <div className="board-frame-bottom" />
        <div className="board-frame-left" />
        <div className="board-frame-right" />
      </div>
      
      {/* Turn indicator */}
      <div className={`turn-indicator ${isWhiteToMove ? 'white-turn' : 'black-turn'}`}>
        <div className="turn-piece">
          {isWhiteToMove ? '♔' : '♚'}
        </div>
        <span className="turn-text">
          {isWhiteToMove ? 'White to move' : 'Black to move'}
        </span>
        <div className="turn-pulse" />
      </div>
    </div>
  );
};
