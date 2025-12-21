/**
 * K6 Spike Test: Game API
 * 
 * Tests how the system handles sudden traffic spikes.
 * This simulates scenarios like a viral moment or game launch.
 * 
 * Run: k6 run spike-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');
const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '10s', target: 5 },    // Warm up
    { duration: '5s', target: 100 },   // Spike to 100 users
    { duration: '30s', target: 100 },  // Stay at spike
    { duration: '10s', target: 5 },    // Scale down
    { duration: '30s', target: 5 },    // Recovery period
    { duration: '5s', target: 200 },   // Even bigger spike
    { duration: '30s', target: 200 },  // Stay at spike
    { duration: '10s', target: 0 },    // Scale down
  ],
  
  thresholds: {
    // During spikes, we allow higher latency but still expect success
    http_req_duration: ['p(95)<2000'],
    errors: ['rate<0.05'], // Allow up to 5% errors during spikes
  },
};

export default function() {
  // Create game
  const createRes = http.post(`${BASE_URL}/game`, JSON.stringify({
    userElo: 1200,
  }), {
    headers: { 'Content-Type': 'application/json' },
    timeout: '10s',
  });
  
  const createSuccess = check(createRes, {
    'create game succeeded': (r) => r.status === 200,
  });
  
  errorRate.add(!createSuccess);
  
  if (createRes.status !== 200) {
    console.error(`Create game failed: ${createRes.status}`);
    return;
  }
  
  const gameId = JSON.parse(createRes.body).gameId;
  
  sleep(0.1);
  
  // Get turn
  const turnRes = http.get(`${BASE_URL}/game/${gameId}/turn`, {
    timeout: '15s',
  });
  
  const turnSuccess = check(turnRes, {
    'get turn succeeded': (r) => r.status === 200,
  });
  
  errorRate.add(!turnSuccess);
  
  sleep(0.5);
}








