/**
 * DynamoGameStore Unit Tests
 * 
 * Tests the DynamoDB-backed game store with mocked AWS SDK.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

// Mock AWS SDK
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => {
  const mockSend = vi.fn();
  return {
    DynamoDBDocumentClient: {
      from: vi.fn().mockReturnValue({ send: mockSend }),
    },
    GetCommand: vi.fn(),
    PutCommand: vi.fn(),
    UpdateCommand: vi.fn(),
    QueryCommand: vi.fn(),
  };
});

import { DynamoGameStore } from './dynamo-game-store';

describe('DynamoGameStore', () => {
  let store: DynamoGameStore;
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Get reference to the mock send function
    mockSend = vi.fn();
    vi.mocked(DynamoDBDocumentClient.from).mockReturnValue({ send: mockSend } as any);
    
    store = new DynamoGameStore('test-table');
  });

  describe('createGame', () => {
    it('should create a game with default ELO', async () => {
      mockSend.mockResolvedValueOnce({});
      
      const gameId = await store.createGame();
      
      expect(gameId).toMatch(/^game-\d+-[a-z0-9]+$/);
      expect(PutCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-table',
          ConditionExpression: 'attribute_not_exists(gameId)',
        })
      );
    });

    it('should create a game with custom ELO and userId', async () => {
      mockSend.mockResolvedValueOnce({});
      
      const gameId = await store.createGame(1800, 'user-123');
      
      expect(gameId).toBeTruthy();
      expect(PutCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-table',
          Item: expect.objectContaining({
            userElo: 1800,
            userId: 'user-123',
            status: 'active',
            version: 1,
          }),
        })
      );
    });

    it('should set initial FEN to starting position', async () => {
      mockSend.mockResolvedValueOnce({});
      
      await store.createGame();
      
      expect(PutCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Item: expect.objectContaining({
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          }),
        })
      );
    });
  });

  describe('getGame', () => {
    it('should return null for non-existent game', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      
      const result = await store.getGame('non-existent');
      
      expect(result).toBeNull();
    });

    it('should return game state with Chess instance', async () => {
      mockSend.mockResolvedValueOnce({
        Item: {
          gameId: 'game-123',
          userId: 'user-456',
          fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
          userElo: 1500,
          turnNumber: 1,
          opponentStyle: 'capablanca',
          status: 'active',
          version: 2,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:01:00.000Z',
        },
      });
      
      const result = await store.getGame('game-123');
      
      expect(result).not.toBeNull();
      expect(result!.gameId).toBe('game-123');
      expect(result!.userId).toBe('user-456');
      expect(result!.userElo).toBe(1500);
      expect(result!.turnNumber).toBe(1);
      expect(result!.opponentStyle).toBe('capablanca');
      expect(result!.status).toBe('active');
      expect(result!.version).toBe(2);
      expect(result!.chess).toBeDefined();
      expect(result!.chess.turn()).toBe('b');
    });

    it('should use projection expression for efficiency', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      
      await store.getGame('game-123');
      
      expect(GetCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          ProjectionExpression: expect.stringContaining('gameId'),
        })
      );
    });
  });

  describe('listGamesForUser', () => {
    it('should query GSI for user games', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [
          { gameId: 'game-1', status: 'active', updatedAt: '2024-01-01', turnNumber: 5, opponentStyle: 'fischer' },
          { gameId: 'game-2', status: 'completed', updatedAt: '2024-01-02', turnNumber: 30, opponentStyle: 'kasparov' },
        ],
      });
      
      const result = await store.listGamesForUser('user-123');
      
      expect(result).toHaveLength(2);
      expect(QueryCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          IndexName: 'ByUserV2',
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: { ':userId': 'user-123' },
          ScanIndexForward: false, // Most recent first
        })
      );
    });

    it('should respect limit parameter', async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      
      await store.listGamesForUser('user-123', 5);
      
      expect(QueryCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Limit: 5,
        })
      );
    });

    it('should return empty array when no games found', async () => {
      mockSend.mockResolvedValueOnce({ Items: undefined });
      
      const result = await store.listGamesForUser('user-123');
      
      expect(result).toEqual([]);
    });
  });

  describe('updateGameWithVersion', () => {
    it('should update game with optimistic locking', async () => {
      mockSend.mockResolvedValueOnce({});
      
      const success = await store.updateGameWithVersion(
        'game-123',
        { fen: 'new-fen', turnNumber: 5 },
        3
      );
      
      expect(success).toBe(true);
      expect(UpdateCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'test-table',
          Key: { gameId: 'game-123' },
          ConditionExpression: '#version = :expectedVersion',
          ExpressionAttributeValues: expect.objectContaining({
            ':expectedVersion': 3,
            ':newVersion': 4,
          }),
        })
      );
    });

    it('should return false on version conflict', async () => {
      const conflictError = new Error('Conditional check failed');
      conflictError.name = 'ConditionalCheckFailedException';
      mockSend.mockRejectedValueOnce(conflictError);
      
      const success = await store.updateGameWithVersion(
        'game-123',
        { fen: 'new-fen' },
        3
      );
      
      expect(success).toBe(false);
    });

    it('should throw other errors', async () => {
      const otherError = new Error('Network error');
      mockSend.mockRejectedValueOnce(otherError);
      
      await expect(
        store.updateGameWithVersion('game-123', { fen: 'new-fen' }, 3)
      ).rejects.toThrow('Network error');
    });

    it('should update all provided fields', async () => {
      mockSend.mockResolvedValueOnce({});
      
      await store.updateGameWithVersion(
        'game-123',
        {
          fen: 'new-fen',
          userElo: 1600,
          turnNumber: 10,
          opponentStyle: 'karpov',
          status: 'completed',
          lastEval: 150,
        },
        1
      );
      
      expect(UpdateCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          UpdateExpression: expect.stringContaining('#fen = :fen'),
        })
      );
    });
  });

  describe('updateGame', () => {
    it('should use optimistic locking internally', async () => {
      // First call: getGame
      mockSend.mockResolvedValueOnce({
        Item: {
          gameId: 'game-123',
          userId: 'user-456',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          userElo: 1500,
          turnNumber: 0,
          opponentStyle: 'fischer',
          status: 'active',
          version: 5,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      });
      // Second call: updateGameWithVersion
      mockSend.mockResolvedValueOnce({});
      
      await store.updateGame('game-123', { fen: 'new-fen' });
      
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should do nothing for non-existent game', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      
      await store.updateGame('non-existent', { fen: 'new-fen' });
      
      expect(mockSend).toHaveBeenCalledTimes(1); // Only getGame
    });
  });

  describe('getFen', () => {
    it('should return FEN for existing game', async () => {
      mockSend.mockResolvedValueOnce({
        Item: {
          gameId: 'game-123',
          userId: 'user-456',
          fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
          userElo: 1500,
          turnNumber: 1,
          opponentStyle: 'fischer',
          status: 'active',
          version: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      });
      
      const fen = await store.getFen('game-123');
      
      expect(fen).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
    });

    it('should return null for non-existent game', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      
      const fen = await store.getFen('non-existent');
      
      expect(fen).toBeNull();
    });
  });

  describe('makeMove', () => {
    it('should make valid move and update state', async () => {
      // getGame
      mockSend.mockResolvedValueOnce({
        Item: {
          gameId: 'game-123',
          userId: 'user-456',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          userElo: 1500,
          turnNumber: 0,
          opponentStyle: 'fischer',
          status: 'active',
          version: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      });
      // updateGameWithVersion
      mockSend.mockResolvedValueOnce({});
      
      const success = await store.makeMove('game-123', 'e2e4');
      
      expect(success).toBe(true);
      expect(UpdateCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          ExpressionAttributeValues: expect.objectContaining({
            ':turnNumber': 1,
          }),
        })
      );
    });

    it('should return false for non-existent game', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      
      const success = await store.makeMove('non-existent', 'e2e4');
      
      expect(success).toBe(false);
    });

    it('should return false for illegal move', async () => {
      mockSend.mockResolvedValueOnce({
        Item: {
          gameId: 'game-123',
          userId: 'user-456',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          userElo: 1500,
          turnNumber: 0,
          opponentStyle: 'fischer',
          status: 'active',
          version: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      });
      
      const success = await store.makeMove('game-123', 'e2e5'); // Illegal pawn move
      
      expect(success).toBe(false);
    });

    it('should handle promotion moves', async () => {
      // A position where pawn can promote
      mockSend.mockResolvedValueOnce({
        Item: {
          gameId: 'game-123',
          userId: 'user-456',
          fen: '8/P7/8/8/8/8/8/4K2k w - - 0 1', // White pawn on a7
          userElo: 1500,
          turnNumber: 10,
          opponentStyle: 'fischer',
          status: 'active',
          version: 5,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      });
      mockSend.mockResolvedValueOnce({});
      
      const success = await store.makeMove('game-123', 'a7a8q'); // Promote to queen
      
      expect(success).toBe(true);
    });
  });

  describe('isGameOver', () => {
    it('should return false for active game', async () => {
      mockSend.mockResolvedValueOnce({
        Item: {
          gameId: 'game-123',
          userId: 'user-456',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          userElo: 1500,
          turnNumber: 0,
          opponentStyle: 'fischer',
          status: 'active',
          version: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      });
      
      const isOver = await store.isGameOver('game-123');
      
      expect(isOver).toBe(false);
    });

    it('should return true for checkmate position', async () => {
      mockSend.mockResolvedValueOnce({
        Item: {
          gameId: 'game-123',
          userId: 'user-456',
          fen: 'rnb1kbnr/pppp1ppp/4p3/8/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3', // Fool's mate
          userElo: 1500,
          turnNumber: 4,
          opponentStyle: 'fischer',
          status: 'active',
          version: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      });
      
      const isOver = await store.isGameOver('game-123');
      
      expect(isOver).toBe(true);
    });

    it('should return true for non-existent game', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      
      const isOver = await store.isGameOver('non-existent');
      
      expect(isOver).toBe(true);
    });
  });

  describe('getSideToMove', () => {
    it('should return w for white to move', async () => {
      mockSend.mockResolvedValueOnce({
        Item: {
          gameId: 'game-123',
          userId: 'user-456',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          userElo: 1500,
          turnNumber: 0,
          opponentStyle: 'fischer',
          status: 'active',
          version: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      });
      
      const side = await store.getSideToMove('game-123');
      
      expect(side).toBe('w');
    });

    it('should return b for black to move', async () => {
      mockSend.mockResolvedValueOnce({
        Item: {
          gameId: 'game-123',
          userId: 'user-456',
          fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
          userElo: 1500,
          turnNumber: 1,
          opponentStyle: 'fischer',
          status: 'active',
          version: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      });
      
      const side = await store.getSideToMove('game-123');
      
      expect(side).toBe('b');
    });

    it('should return null for non-existent game', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      
      const side = await store.getSideToMove('non-existent');
      
      expect(side).toBeNull();
    });
  });
});

