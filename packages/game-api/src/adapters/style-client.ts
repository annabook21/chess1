/**
 * Style Service Client
 * 
 * HTTP client for style service
 */

import axios, { AxiosInstance } from 'axios';
import {
  SuggestMovesRequest,
  SuggestMovesResponse,
  MasterStyle,
} from '@master-academy/contracts';

export class StyleClient {
  private client: AxiosInstance;

  constructor(baseUrl: string = process.env.STYLE_SERVICE_URL || 'http://localhost:3002') {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
    });
  }

  async suggestMoves(fen: string, styleId: MasterStyle, topK: number = 10): Promise<string[]> {
    const request: SuggestMovesRequest = { fen, styleId, topK };
    const response = await this.client.post<SuggestMovesResponse>('/style/suggest', request);
    return response.data.moves;
  }
}

