/**
 * DynamoDB-backed Game Store
 * Small, per-request hydration of Chess state from stored FEN.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Chess } from 'chess.js';
import { TurnPackage } from '@master-academy/contracts';

interface GameStateRecord {
  gameId: string;
  fen: string;
  userElo: number;
  currentTurn?: TurnPackage | null;
  createdAt: string;
  updatedAt: string;
}

interface GameState {
  gameId: string;
  chess: Chess;
  currentTurn: TurnPackage | null;
  userElo: number;
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

  async createGame(userElo: number = 1200): Promise<string> {
    const gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const chess = new Chess();
    const record: GameStateRecord = {
      gameId,
      fen: chess.fen(),
      userElo,
      currentTurn: null,
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

  async getGame(gameId: string): Promise<GameState | null> {
    const res = await this.docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: { gameId },
    }));

    if (!res.Item) return null;
    const item = res.Item as GameStateRecord;
    return {
      gameId: item.gameId,
      chess: new Chess(item.fen),
      currentTurn: item.currentTurn ?? null,
      userElo: item.userElo,
      createdAt: new Date(item.createdAt),
    };
  }

  async updateGame(gameId: string, updates: Partial<{ fen: string; currentTurn: TurnPackage | null; userElo: number; }>): Promise<void> {
    const expressions: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = { ':updatedAt': this.nowIso() };

    if (typeof updates.fen === 'string') {
      expressions.push('#fen = :fen');
      names['#fen'] = 'fen';
      values[':fen'] = updates.fen;
    }
    if (updates.currentTurn !== undefined) {
      expressions.push('#currentTurn = :currentTurn');
      names['#currentTurn'] = 'currentTurn';
      values[':currentTurn'] = updates.currentTurn;
    }
    if (typeof updates.userElo === 'number') {
      expressions.push('#userElo = :userElo');
      names['#userElo'] = 'userElo';
      values[':userElo'] = updates.userElo;
    }

    expressions.push('#updatedAt = :updatedAt');
    names['#updatedAt'] = 'updatedAt';

    await this.docClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { gameId },
      UpdateExpression: 'SET ' + expressions.join(', '),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }));
  }

  async getFen(gameId: string): Promise<string | null> {
    const game = await this.getGame(gameId);
    return game ? game.chess.fen() : null;
  }

  async makeMove(gameId: string, moveUci: string): Promise<boolean> {
    const game = await this.getGame(gameId);
    if (!game) return false;

    try {
      // Parse UCI notation (e.g., "e2e4" or "e7e8q") to object notation
      // chess.js .move() accepts {from, to, promotion} which is more explicit
      const from = moveUci.substring(0, 2);
      const to = moveUci.substring(2, 4);
      const promotion = moveUci.length > 4 ? moveUci[4] : undefined;
      
      const move = game.chess.move({ from, to, promotion: promotion as any });
      if (!move) return false;
      await this.updateGame(gameId, { fen: game.chess.fen() });
      return true;
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

