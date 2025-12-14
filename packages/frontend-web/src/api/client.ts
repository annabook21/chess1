/**
 * API Client
 */

import axios from 'axios';
import { TurnPackage, MoveRequest, MoveResponse } from '@master-academy/contracts';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function createGame(userElo: number = 1200): Promise<{ gameId: string }> {
  const response = await client.post('/game', { userElo });
  return response.data;
}

export async function getTurn(gameId: string): Promise<TurnPackage> {
  const response = await client.get(`/game/${gameId}/turn`);
  return response.data;
}

export async function submitMove(gameId: string, move: MoveRequest): Promise<MoveResponse> {
  const response = await client.post(`/game/${gameId}/move`, move);
  return response.data;
}

