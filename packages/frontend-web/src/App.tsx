/**
 * Main App Component
 */

import React, { useState, useEffect } from 'react';
import { ChessBoard } from './components/ChessBoard';
import { MoveChoices } from './components/MoveChoices';
import { Feedback } from './components/Feedback';
import { createGame, getTurn, submitMove } from './api/client';
import { TurnPackage, MoveRequest, MoveResponse } from '@master-academy/contracts';
import './App.css';

function App() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [turnPackage, setTurnPackage] = useState<TurnPackage | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<MoveResponse['feedback'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create game on mount
    initializeGame();
  }, []);

  const initializeGame = async () => {
    try {
      setLoading(true);
      const { gameId } = await createGame(1200);
      setGameId(gameId);
      const turn = await getTurn(gameId);
      setTurnPackage(turn);
    } catch (err) {
      setError('Failed to initialize game');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChoiceSelect = (choiceId: string) => {
    setSelectedChoice(choiceId);
  };

  const handleMoveSubmit = async () => {
    if (!gameId || !selectedChoice || !turnPackage) return;

    const choice = turnPackage.choices.find(c => c.id === selectedChoice);
    if (!choice) return;

    try {
      setLoading(true);
      setError(null);
      const moveRequest: MoveRequest = {
        moveUci: choice.moveUci,
        choiceId: selectedChoice,
      };

      const response = await submitMove(gameId, moveRequest);
      setFeedback(response.feedback);

      if (response.nextTurn) {
        setTurnPackage(response.nextTurn);
        setSelectedChoice(null);
      } else {
        // Game over
        setTurnPackage(null);
      }
    } catch (err) {
      setError('Failed to submit move');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !turnPackage) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Loading game...</div>
      </div>
    );
  }

  if (error && !turnPackage) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ color: '#f44336' }}>{error}</div>
        <button onClick={initializeGame} style={{ marginTop: '20px', padding: '10px 20px' }}>
          Retry
        </button>
      </div>
    );
  }

  if (!turnPackage) {
    return null;
  }

  return (
    <div className="app">
      <header style={{ padding: '20px', textAlign: 'center', backgroundColor: '#2a2a2a' }}>
        <h1>Master Academy Chess</h1>
        <p>Learn chess through master-style micro-lessons</p>
      </header>

      <main style={{ flex: 1, padding: '20px' }}>
        <ChessBoard
          fen={turnPackage.fen}
          choices={turnPackage.choices}
          selectedChoice={selectedChoice}
        />

        <div style={{ marginTop: '20px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '15px' }}>
            Choose Your Move (Master Style)
          </h2>
          <MoveChoices
            choices={turnPackage.choices}
            selectedChoice={selectedChoice}
            onSelectChoice={handleChoiceSelect}
          />
        </div>

        {selectedChoice && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              onClick={handleMoveSubmit}
              disabled={loading}
              style={{
                padding: '12px 30px',
                fontSize: '16px',
                backgroundColor: '#4a9eff',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Processing...' : 'Make Move'}
            </button>
          </div>
        )}

        {feedback && <Feedback feedback={feedback} />}

        {error && (
          <div style={{ padding: '15px', backgroundColor: '#f44336', color: '#fff', borderRadius: '6px', marginTop: '20px' }}>
            {error}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

