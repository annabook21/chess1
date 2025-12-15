/**
 * DynamoDB-backed Game Store - Optimized
 * 
 * Optimizations:
 * 1. Added userId for ByUser GSI queries
 * 2. Optimistic locking with version field
 * 3. Don't store large currentTurn blob - store minimal state only
 * 4. Fast projection expressions for list queries
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  UpdateCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { Chess } from 'chess.js';
import { TurnPackage, MasterStyle } from '@master-academy/contracts';

// Minimal record stored in DynamoDB (no large turn payloads)
interface GameStateRecord {
  gameId: string;
  userId: string;              // Added for GSI queries
  fen: string;
  userElo: number;
  turnNumber: number;          // Track progress
  opponentStyle: MasterStyle;  // Current AI opponent
  status: 'active' | 'completed' | 'abandoned';
  version: number;             // Optimistic locking
  createdAt: string;
  updatedAt: string;
  lastEval?: number;           // Last position evaluation
  // NOTE: currentTurn NOT stored - computed on demand
}

// Lightweight record for list queries (GSI projection)
interface GameListItem {
  gameId: string;
  status: 'active' | 'completed' | 'abandoned';
  updatedAt: string;
  turnNumber: number;
  opponentStyle: MasterStyle;
  lastEval?: number;
}

interface GameState {
  gameId: string;
  userId: string;
  chess: Chess;
  currentTurn: TurnPackage | null;
  userElo: number;
  turnNumber: number;
  opponentStyle: MasterStyle;
  status: 'active' | 'completed' | 'abandoned';
  version: number;
  createdAt: Date;
}

export class DynamoGameStore {
  private tableName: string;
  private docClient: DynamoDBDocumentClient;

  constructor(tableName: string, client?: DynamoDBClient) {
    this.tableName = tableName;
    const base = client || new DynamoDBClient({});
    this.docClient = DynamoDBDocumentClient.from(base);
  }

  private nowIso(): string {
    return new Date().toISOString();
  }

  /**
   * Create a new game
   */
  async createGame(userElo: number = 1200, userId: string = 'anonymous'): Promise<string> {
    const gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const chess = new Chess();
    
    const record: GameStateRecord = {
      gameId,
      userId,
      fen: chess.fen(),
      userElo,
      turnNumber: 0,
      opponentStyle: 'fischer', // Default, can be changed
      status: 'active',
      version: 1,
      createdAt: this.nowIso(),
      updatedAt: this.nowIso(),
    };

    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: record,
      ConditionExpression: 'attribute_not_exists(gameId)',
    }));

    return gameId;
  }

  /**
   * Get game state (fast - single GetItem)
   */
  async getGame(gameId: string): Promise<GameState | null> {
    const res = await this.docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: { gameId },
      // Only fetch what we need
      ProjectionExpression: 'gameId, userId, fen, userElo, turnNumber, opponentStyle, #status, version, createdAt, updatedAt',
      ExpressionAttributeNames: { '#status': 'status' },
    }));

    if (!res.Item) return null;
    const item = res.Item as GameStateRecord;
    
    return {
      gameId: item.gameId,
      userId: item.userId,
      chess: new Chess(item.fen),
      currentTurn: null, // Computed on demand, not stored
      userElo: item.userElo,
      turnNumber: item.turnNumber,
      opponentStyle: item.opponentStyle,
      status: item.status,
      version: item.version,
      createdAt: new Date(item.createdAt),
    };
  }

  /**
   * List games for a user (fast - uses GSI)
   */
  async listGamesForUser(userId: string, limit: number = 10): Promise<GameListItem[]> {
    const res = await this.docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'ByUserV2', // Optimized GSI with updatedAt sort
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      ProjectionExpression: 'gameId, #status, updatedAt, turnNumber, opponentStyle, lastEval',
      ExpressionAttributeNames: { '#status': 'status' },
      ScanIndexForward: false, // Most recent first
      Limit: limit,
    }));

    return (res.Items || []) as GameListItem[];
  }

  /**
   * Update game with optimistic locking (internal)
   */
  async updateGameWithVersion(
    gameId: string, 
    updates: Partial<{ 
      fen: string; 
      userElo: number;
      turnNumber: number;
      opponentStyle: MasterStyle;
      status: 'active' | 'completed' | 'abandoned';
      lastEval: number;
    }>,
    expectedVersion: number
  ): Promise<boolean> {
    const expressions: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = { 
      ':updatedAt': this.nowIso(),
      ':expectedVersion': expectedVersion,
      ':newVersion': expectedVersion + 1,
    };

    if (typeof updates.fen === 'string') {
      expressions.push('#fen = :fen');
      names['#fen'] = 'fen';
      values[':fen'] = updates.fen;
    }
    if (typeof updates.userElo === 'number') {
      expressions.push('#userElo = :userElo');
      names['#userElo'] = 'userElo';
      values[':userElo'] = updates.userElo;
    }
    if (typeof updates.turnNumber === 'number') {
      expressions.push('#turnNumber = :turnNumber');
      names['#turnNumber'] = 'turnNumber';
      values[':turnNumber'] = updates.turnNumber;
    }
    if (updates.opponentStyle) {
      expressions.push('#opponentStyle = :opponentStyle');
      names['#opponentStyle'] = 'opponentStyle';
      values[':opponentStyle'] = updates.opponentStyle;
    }
    if (updates.status) {
      expressions.push('#status = :status');
      names['#status'] = 'status';
      values[':status'] = updates.status;
    }
    if (typeof updates.lastEval === 'number') {
      expressions.push('#lastEval = :lastEval');
      names['#lastEval'] = 'lastEval';
      values[':lastEval'] = updates.lastEval;
    }

    expressions.push('#updatedAt = :updatedAt');
    names['#updatedAt'] = 'updatedAt';
    
    expressions.push('#version = :newVersion');
    names['#version'] = 'version';

    try {
      await this.docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { gameId },
        UpdateExpression: 'SET ' + expressions.join(', '),
        ConditionExpression: '#version = :expectedVersion', // Optimistic lock
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      }));
      return true;
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        console.warn(`Optimistic lock failed for game ${gameId}, expected version ${expectedVersion}`);
        return false;
      }
      throw error;
    }
  }

  /**
   * Update game (IGameStore compatible signature)
   * Uses optimistic locking internally
   */
  async updateGame(
    gameId: string, 
    updates: Partial<{ fen: string; currentTurn: TurnPackage | null; userElo: number; }>
  ): Promise<void> {
    const game = await this.getGame(gameId);
    if (!game) return;
    
    await this.updateGameWithVersion(gameId, {
      fen: updates.fen,
      userElo: updates.userElo,
    }, game.version);
  }

  async getFen(gameId: string): Promise<string | null> {
    const game = await this.getGame(gameId);
    return game ? game.chess.fen() : null;
  }

  async makeMove(gameId: string, moveUci: string): Promise<boolean> {
    const game = await this.getGame(gameId);
    if (!game) return false;

    try {
      const from = moveUci.substring(0, 2);
      const to = moveUci.substring(2, 4);
      const promotion = moveUci.length > 4 ? moveUci[4] : undefined;
      
      const move = game.chess.move({ from, to, promotion: promotion as any });
      if (!move) return false;
      
      const success = await this.updateGameWithVersion(gameId, { 
        fen: game.chess.fen(),
        turnNumber: game.turnNumber + 1,
      }, game.version);
      
      return success;
    } catch {
      return false;
    }
  }

  async isGameOver(gameId: string): Promise<boolean> {
    const game = await this.getGame(gameId);
    if (!game) return true;
    return game.chess.isGameOver();
  }

  async getSideToMove(gameId: string): Promise<'w' | 'b' | null> {
    const game = await this.getGame(gameId);
    if (!game) return null;
    return game.chess.turn() === 'w' ? 'w' : 'b';
  }
}
