/**
 * REAL Stockfish Engine Wrapper
 * 
 * Uses Stockfish binary via child_process for reliable UCI communication.
 * In Docker: uses /usr/games/stockfish (installed via apt)
 * Locally: falls back to chess.js heuristics if stockfish not found
 */

import { spawn, ChildProcess } from 'child_process';
import { Chess } from 'chess.js';
import * as readline from 'readline';

export interface EngineAnalysis {
  eval: number;       // centipawns (positive = white advantage)
  pv: string[];       // principal variation (UCI moves)
  depth: number;
  mate?: number;      // mate in N moves (if found)
}

// Engine singleton
let engineInstance: StockfishWrapper | null = null;

export class StockfishWrapper {
  private process: ChildProcess | null = null;
  private ready: boolean = false;
  private uciOk: boolean = false;
  private currentElo: number = 3000;
  private pendingCallbacks: Map<string, (lines: string[]) => void> = new Map();
  private outputBuffer: string[] = [];
  private useFallback: boolean = false;
  private debugging: boolean = process.env.DEBUG_ENGINE === 'true';

  constructor() {
    this.initEngine();
  }

  static getInstance(): StockfishWrapper {
    if (!engineInstance) {
      engineInstance = new StockfishWrapper();
    }
    return engineInstance;
  }

  private initEngine(): void {
    // Try common stockfish paths
    const paths = [
      '/usr/games/stockfish',      // Linux apt install
      '/usr/local/bin/stockfish',  // Homebrew
      '/usr/bin/stockfish',        // Linux
      'stockfish',                 // In PATH
    ];

    let stockfishPath: string | null = null;
    
    // Check which path exists using existsSync-like approach
    const { existsSync } = require('fs');
    for (const p of paths) {
      // For absolute paths, check if file exists
      if (p.startsWith('/')) {
        if (existsSync(p)) {
          stockfishPath = p;
          break;
        }
      }
    }

    if (!stockfishPath) {
      console.warn('[STOCKFISH] No stockfish binary found - using fallback heuristics');
      this.useFallback = true;
      this.ready = true;
      return;
    }

    console.log('[STOCKFISH] Starting engine from:', stockfishPath);

    try {
      this.process = spawn(stockfishPath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (err) {
      console.error('[STOCKFISH] Failed to spawn process:', err);
      this.useFallback = true;
      this.ready = true;
      return;
    }

    const rl = readline.createInterface({
      input: this.process.stdout!,
      terminal: false,
    });

    rl.on('line', (line: string) => {
      if (this.debugging) {
        console.log('[STOCKFISH] <<', line);
      }
      this.handleLine(line);
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      console.error('[STOCKFISH] stderr:', data.toString());
    });

    this.process.on('error', (err: Error) => {
      console.error('[STOCKFISH] Process error:', err);
      this.useFallback = true;
      this.ready = true;
    });

    this.process.on('close', (code: number) => {
      console.log('[STOCKFISH] Process exited with code:', code);
      this.ready = false;
    });

    // Initialize UCI
    this.send('uci');
  }

  private handleLine(line: string): void {
    this.outputBuffer.push(line);

    if (line === 'uciok') {
      this.uciOk = true;
      // Set hash and threads
      this.send('setoption name Hash value 64');
      this.send('setoption name Threads value 1');
      this.send('isready');
    } else if (line === 'readyok') {
      this.ready = true;
      console.log('[STOCKFISH] Engine ready');
    } else if (line.startsWith('bestmove')) {
      // Analysis complete - resolve pending callback
      const cb = this.pendingCallbacks.get('go');
      if (cb) {
        this.pendingCallbacks.delete('go');
        cb([...this.outputBuffer]);
        this.outputBuffer = [];
      }
    }
  }

  private send(cmd: string): void {
    if (this.debugging) {
      console.log('[STOCKFISH] >>', cmd);
    }
    if (this.process?.stdin) {
      this.process.stdin.write(cmd + '\n');
    }
  }

  private async waitReady(timeoutMs: number = 5000): Promise<boolean> {
    if (this.useFallback) return true;
    if (this.ready) return true;

    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (this.ready) {
          resolve(true);
        } else if (Date.now() - start > timeoutMs) {
          console.warn('[STOCKFISH] Timeout waiting for engine - using fallback');
          this.useFallback = true;
          resolve(true);
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  /**
   * Analyze a position and return the best move with evaluation
   */
  async analyzePosition(fen: string, depth: number = 15): Promise<EngineAnalysis> {
    await this.waitReady();

    if (this.useFallback) {
      return this.fallbackAnalysis(fen);
    }

    return new Promise((resolve) => {
      this.outputBuffer = [];

      this.pendingCallbacks.set('go', (lines: string[]) => {
        const result = this.parseAnalysisOutput(lines, fen);
        resolve(result);
      });

      this.send(`position fen ${fen}`);
      this.send(`go depth ${depth}`);

      // Timeout fallback
      setTimeout(() => {
        if (this.pendingCallbacks.has('go')) {
          this.pendingCallbacks.delete('go');
          this.send('stop');
          resolve(this.fallbackAnalysis(fen));
        }
      }, 10000);
    });
  }

  /**
   * Analyze position with time limit
   */
  async analyzePositionWithTime(fen: string, timeMs: number): Promise<EngineAnalysis> {
    await this.waitReady();

    if (this.useFallback) {
      return this.fallbackAnalysis(fen);
    }

    return new Promise((resolve) => {
      this.outputBuffer = [];

      this.pendingCallbacks.set('go', (lines: string[]) => {
        const result = this.parseAnalysisOutput(lines, fen);
        resolve(result);
      });

      this.send(`position fen ${fen}`);
      this.send(`go movetime ${timeMs}`);

      setTimeout(() => {
        if (this.pendingCallbacks.has('go')) {
          this.pendingCallbacks.delete('go');
          this.send('stop');
          resolve(this.fallbackAnalysis(fen));
        }
      }, timeMs + 5000);
    });
  }

  private parseAnalysisOutput(lines: string[], fen: string): EngineAnalysis {
    let bestEval = 0;
    let bestPv: string[] = [];
    let bestDepth = 0;
    let mate: number | undefined;
    let bestMove = '';

    for (const line of lines) {
      if (line.startsWith('info') && line.includes('score')) {
        const depthMatch = line.match(/depth (\d+)/);
        const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
        const pvMatch = line.match(/ pv (.+)/);

        if (depthMatch) {
          bestDepth = parseInt(depthMatch[1]);
        }

        if (scoreMatch) {
          if (scoreMatch[1] === 'cp') {
            bestEval = parseInt(scoreMatch[2]);
            mate = undefined;
          } else if (scoreMatch[1] === 'mate') {
            mate = parseInt(scoreMatch[2]);
            bestEval = mate > 0 ? 10000 - mate * 100 : -10000 - mate * 100;
          }
        }

        if (pvMatch) {
          bestPv = pvMatch[1].trim().split(' ').filter(m => m.length >= 4);
        }
      }

      if (line.startsWith('bestmove')) {
        const match = line.match(/bestmove (\w+)/);
        if (match) {
          bestMove = match[1];
        }
      }
    }

    // Ensure PV has bestmove
    if (bestPv.length === 0 && bestMove) {
      bestPv = [bestMove];
    }

    return {
      eval: bestEval,
      pv: bestPv.length > 0 ? bestPv : this.getFallbackMoves(fen),
      depth: bestDepth,
      mate,
    };
  }

  /**
   * Check if a move is legal
   */
  async isLegalMove(fen: string, moveUci: string): Promise<boolean> {
    try {
      const chess = new Chess(fen);
      const from = moveUci.substring(0, 2);
      const to = moveUci.substring(2, 4);
      const promotion = moveUci.length > 4 ? moveUci[4] : undefined;
      const move = chess.move({ from, to, promotion: promotion as any });
      return !!move;
    } catch {
      return false;
    }
  }

  /**
   * Score multiple moves
   */
  async scoreMoves(fen: string, moves: string[]): Promise<Array<{ move: string; evalDelta: number; pv: string[] }>> {
    const baseAnalysis = await this.analyzePosition(fen, 10);
    const baseEval = baseAnalysis.eval;
    const chess = new Chess(fen);
    const sideToMove = chess.turn();

    const results: Array<{ move: string; evalDelta: number; pv: string[] }> = [];

    for (const moveUci of moves) {
      try {
        const from = moveUci.substring(0, 2);
        const to = moveUci.substring(2, 4);
        const promotion = moveUci.length > 4 ? moveUci[4] : undefined;

        const testChess = new Chess(fen);
        const move = testChess.move({ from, to, promotion: promotion as any });

        if (!move) {
          results.push({ move: moveUci, evalDelta: -1000, pv: [] });
          continue;
        }

        const newFen = testChess.fen();
        const newAnalysis = await this.analyzePosition(newFen, 8);

        // Flip eval (it's from opponent's perspective now)
        const newEval = -newAnalysis.eval;
        const evalDelta = sideToMove === 'w' ? newEval - baseEval : baseEval - newEval;

        results.push({
          move: moveUci,
          evalDelta,
          pv: [moveUci, ...newAnalysis.pv.slice(0, 3)],
        });
      } catch {
        results.push({ move: moveUci, evalDelta: -1000, pv: [] });
      }
    }

    return results.sort((a, b) => b.evalDelta - a.evalDelta);
  }

  /**
   * Set engine playing strength using UCI_Elo
   */
  setStrength(elo: number): void {
    this.currentElo = Math.max(1320, Math.min(3190, elo));

    if (!this.useFallback && this.uciOk) {
      this.send('setoption name UCI_LimitStrength value true');
      this.send(`setoption name UCI_Elo value ${this.currentElo}`);
      console.log(`[STOCKFISH] Strength set to ${this.currentElo} ELO`);
    }
  }

  /**
   * Fallback analysis using chess.js heuristics
   */
  private fallbackAnalysis(fen: string): EngineAnalysis {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    const eval_ = this.evaluatePosition(chess);

    return {
      eval: eval_,
      pv: moves.slice(0, 3).map(m => `${m.from}${m.to}${m.promotion || ''}`),
      depth: 1,
    };
  }

  private evaluatePosition(board: Chess): number {
    const pieceValues: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
    let score = 0;

    const boardState = board.board();
    for (const row of boardState) {
      for (const square of row) {
        if (square) {
          const value = pieceValues[square.type] || 0;
          score += square.color === 'w' ? value : -value;
        }
      }
    }

    return score;
  }

  private getFallbackMoves(fen: string): string[] {
    try {
      const chess = new Chess(fen);
      const moves = chess.moves({ verbose: true });
      return moves.slice(0, 3).map(m => `${m.from}${m.to}${m.promotion || ''}`);
    } catch {
      return [];
    }
  }

  destroy(): void {
    if (this.process) {
      this.send('quit');
      setTimeout(() => {
        this.process?.kill();
        this.process = null;
      }, 100);
    }
    this.ready = false;
    engineInstance = null;
  }
}
