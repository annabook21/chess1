/**
 * Coach Service Client
 * 
 * HTTP client for coach service
 */

import axios, { AxiosInstance } from 'axios';
import {
  ExplainChoiceRequest,
  ExplainChoiceResponse,
} from '@master-academy/contracts';

export class CoachClient {
  private client: AxiosInstance;

  constructor(baseUrl: string = process.env.COACH_SERVICE_URL || 'http://localhost:3003') {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 15000,
    });
  }

  async explainChoice(request: ExplainChoiceRequest): Promise<ExplainChoiceResponse> {
    const response = await this.client.post<ExplainChoiceResponse>('/coach/explain', request);
    return response.data;
  }
}

