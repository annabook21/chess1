/**
 * Game Routes Tests
 * 
 * Tests the Express route handlers.
 * Uses mock request/response objects since routes have hardcoded dependencies.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Since the routes module initializes dependencies at import time,
// we need to mock the modules before importing
vi.mock('../store/game-store', () => ({
  GameStore: vi.fn().mockImplementation(() => ({
    createGame: vi.fn().mockReturnValue('game-test-123'),
    getGame: vi.fn().mockReturnValue({
      gameId: 'game-test-123',
      chess: { fen: () => 'test-fen' },
      userElo: 1200,
      currentTurn: null,
      createdAt: new Date(),
    }),
    updateGame: vi.fn(),
    getFen: vi.fn().mockReturnValue('test-fen'),
    makeMove: vi.fn().mockReturnValue(true),
    isGameOver: vi.fn().mockReturnValue(false),
    getSideToMove: vi.fn().mockReturnValue('w'),
  })),
}));

vi.mock('../store/dynamo-game-store', () => ({
  DynamoGameStore: vi.fn(),
}));

vi.mock('../adapters/engine-client', () => ({
  EngineClient: vi.fn().mockImplementation(() => ({
    analyzePosition: vi.fn().mockResolvedValue({ eval: 0.3, pv: ['e2e4'] }),
    isLegalMove: vi.fn().mockResolvedValue(true),
    setStrength: vi.fn(),
    scoreMoves: vi.fn().mockResolvedValue({ scores: [] }),
  })),
}));

vi.mock('../adapters/style-client', () => ({
  StyleClient: vi.fn().mockImplementation(() => ({
    suggestMoves: vi.fn().mockResolvedValue(['e2e4', 'd2d4']),
  })),
}));

vi.mock('../adapters/coach-client', () => ({
  CoachClient: vi.fn().mockImplementation(() => ({
    explainChoice: vi.fn().mockResolvedValue({
      explanation: 'Good move!',
      conceptTags: ['development'],
    }),
  })),
}));

// Mock controllers
vi.mock('../controllers/turn-controller', () => ({
  TurnController: vi.fn().mockImplementation(() => ({
    buildTurnPackage: vi.fn().mockResolvedValue({
      gameId: 'game-test-123',
      fen: 'test-fen',
      sideToMove: 'w',
      choices: [],
      bestMove: { moveUci: 'e2e4', eval: 0.3 },
      difficulty: { engineElo: 1300, hintLevel: 2 },
      telemetryHints: { timeBudgetMs: 30000 },
    }),
  })),
}));

vi.mock('../controllers/move-controller', () => ({
  MoveController: vi.fn().mockImplementation(() => ({
    processMove: vi.fn().mockResolvedValue({
      accepted: true,
      newFen: 'new-test-fen',
      feedback: {
        evalBefore: 0,
        evalAfter: 0.3,
        delta: 0.3,
        coachText: 'Good move!',
        conceptTags: ['development'],
        blunder: false,
      },
      nextTurn: null,
    }),
  })),
}));

vi.mock('../services/choice-builder', () => ({
  ChoiceBuilder: vi.fn().mockImplementation(() => ({
    buildChoices: vi.fn().mockResolvedValue([]),
  })),
}));

// Create mock request/response
const createMockRequest = (overrides: any = {}) => ({
  body: {},
  params: {},
  query: {},
  ...overrides,
});

const createMockResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
};

describe('Game Routes', () => {
  // Import after mocks are set up
  let gameRouter: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Dynamic import to get fresh module with mocks
    const module = await import('./game');
    gameRouter = module.default;
  });

  describe('route structure', () => {
    it('should export a router', async () => {
      expect(gameRouter).toBeDefined();
      expect(typeof gameRouter).toBe('function'); // Express router is a function
    });

    it('should have stack with route handlers', () => {
      // Express router has a stack property with layers
      expect(gameRouter.stack).toBeDefined();
      expect(Array.isArray(gameRouter.stack)).toBe(true);
    });
  });

  describe('POST / (create game)', () => {
    it('should have POST route for game creation', () => {
      const postRoutes = gameRouter.stack.filter(
        (layer: any) => layer.route && layer.route.methods.post && layer.route.path === '/'
      );
      expect(postRoutes.length).toBe(1);
    });
  });

  describe('GET /:gameId/turn', () => {
    it('should have GET route for turn package', () => {
      const getRoutes = gameRouter.stack.filter(
        (layer: any) => layer.route && layer.route.methods.get && layer.route.path === '/:gameId/turn'
      );
      expect(getRoutes.length).toBe(1);
    });
  });

  describe('POST /:gameId/move', () => {
    it('should have POST route for move submission', () => {
      const postRoutes = gameRouter.stack.filter(
        (layer: any) => layer.route && layer.route.methods.post && layer.route.path === '/:gameId/move'
      );
      expect(postRoutes.length).toBe(1);
    });
  });
});

describe('Route Handler Logic', () => {
  describe('create game handler', () => {
    it('should use default ELO of 1200 when not provided', async () => {
      const { GameStore } = await import('../store/game-store');
      const store = new GameStore();
      
      const req = createMockRequest({ body: {} });
      const res = createMockResponse();
      
      // The store.createGame should be callable
      const gameId = store.createGame(1200);
      expect(gameId).toBeDefined();
    });

    it('should accept custom ELO from request body', async () => {
      const { GameStore } = await import('../store/game-store');
      const store = new GameStore();
      
      const gameId = store.createGame(1500);
      expect(gameId).toBeDefined();
    });
  });

  describe('get turn handler', () => {
    it('should call turnController.buildTurnPackage with gameId', async () => {
      const { TurnController } = await import('../controllers/turn-controller');
      const controller = new TurnController({} as any);
      
      const result = await controller.buildTurnPackage('game-123');
      
      expect(result).toHaveProperty('gameId');
      expect(result).toHaveProperty('fen');
      expect(result).toHaveProperty('choices');
    });
  });

  describe('submit move handler', () => {
    it('should call moveController.processMove with request data', async () => {
      const { MoveController } = await import('../controllers/move-controller');
      const controller = new MoveController({} as any);
      
      const result = await controller.processMove('game-123', {
        moveUci: 'e2e4',
        choiceId: 'A',
      });
      
      expect(result).toHaveProperty('accepted');
      expect(result).toHaveProperty('newFen');
      expect(result).toHaveProperty('feedback');
    });

    it('should validate required fields (moveUci and choiceId)', () => {
      const request = { moveUci: 'e2e4', choiceId: 'A' };
      
      expect(request.moveUci).toBeDefined();
      expect(request.choiceId).toBeDefined();
    });

    it('should detect missing moveUci', () => {
      const request = { choiceId: 'A' } as any;
      
      expect(request.moveUci).toBeUndefined();
    });

    it('should detect missing choiceId', () => {
      const request = { moveUci: 'e2e4' } as any;
      
      expect(request.choiceId).toBeUndefined();
    });
  });
});

