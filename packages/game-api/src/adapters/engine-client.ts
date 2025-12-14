/**
 * Engine Service Client
 * 
 * Thin HTTP client for engine service
 */

import axios, { AxiosInstance } from 'axios';
import {
  AnalyzePositionRequest,
  AnalyzePositionResponse,
  ScoreMovesRequest,
  ScoreMovesResponse,
} from '@master-academy/contracts';

export class EngineClient {
  private client: AxiosInstance;

  constructor(baseUrl: string = process.env.ENGINE_SERVICE_URL || 'http://localhost:3001') {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000, // 30s timeout for engine analysis
    });
  }

  async analyzePosition(request: AnalyzePositionRequest): Promise<AnalyzePositionResponse> {
    const response = await this.client.post<AnalyzePositionResponse>('/engine/analyze', request);
    return response.data;
  }

  async isLegalMove(fen: string, moveUci: string): Promise<boolean> {
    const response = await this.client.get<{ isLegal: boolean }>('/engine/is-legal', {
      params: { fen, moveUci },
    });
    return response.data.isLegal;
  }

  async scoreMoves(request: ScoreMovesRequest): Promise<ScoreMovesResponse> {
    const response = await this.client.post<ScoreMovesResponse>('/engine/score-moves', request);
    return response.data;
  }

  async setStrength(elo: number): Promise<void> {
    await this.client.post('/engine/set-strength', { elo });
  }
}

