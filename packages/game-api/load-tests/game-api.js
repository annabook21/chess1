/**
 * K6 Load Test: Game API
 * 
 * Simulates realistic user game flow.
 * Run: k6 run game-api.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const createGameDuration = new Trend('create_game_duration');
const getTurnDuration = new Trend('get_turn_duration');
const submitMoveDuration = new Trend('submit_move_duration');

// Configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export const options = {
  // Stages simulate realistic traffic patterns
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 20 },   // Ramp up to 20 users
    { duration: '2m', target: 20 },   // Stay at 20 users
    { duration: '30s', target: 50 },  // Spike to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  
  thresholds: {
    // 95% of requests should complete within 500ms
    http_req_duration: ['p(95)<500'],
    // Error rate should be less than 1%
    errors: ['rate<0.01'],
    // Custom thresholds
    create_game_duration: ['p(95)<200'],
    get_turn_duration: ['p(95)<1000'],
    submit_move_duration: ['p(95)<2000'],
  },
};

// Starting position
const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Sample legal moves from starting position
const OPENING_MOVES = ['e2e4', 'd2d4', 'g1f3', 'c2c4', 'e2e3'];

export default function() {
  let gameId;
  
  group('Create Game', () => {
    const startTime = Date.now();
    
    const createRes = http.post(`${BASE_URL}/game`, JSON.stringify({
      userElo: 1200 + Math.floor(Math.random() * 800), // Random ELO 1200-2000
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    createGameDuration.add(Date.now() - startTime);
    
    const success = check(createRes, {
      'create game status is 200': (r) => r.status === 200,
      'create game returns gameId': (r) => {
        const body = JSON.parse(r.body);
        gameId = body.gameId;
        return !!gameId;
      },
    });
    
    errorRate.add(!success);
  });
  
  if (!gameId) {
    console.error('Failed to create game, skipping turn and move tests');
    return;
  }
  
  sleep(0.5); // Brief pause between requests
  
  group('Get Turn Package', () => {
    const startTime = Date.now();
    
    const turnRes = http.get(`${BASE_URL}/game/${gameId}/turn`);
    
    getTurnDuration.add(Date.now() - startTime);
    
    const success = check(turnRes, {
      'get turn status is 200': (r) => r.status === 200,
      'turn package has choices': (r) => {
        const body = JSON.parse(r.body);
        return body.choices && body.choices.length > 0;
      },
      'turn package has fen': (r) => {
        const body = JSON.parse(r.body);
        return !!body.fen;
      },
    });
    
    errorRate.add(!success);
  });
  
  sleep(1); // Simulate user thinking time
  
  group('Submit Move', () => {
    const startTime = Date.now();
    
    const randomMove = OPENING_MOVES[Math.floor(Math.random() * OPENING_MOVES.length)];
    
    const moveRes = http.post(`${BASE_URL}/game/${gameId}/move`, JSON.stringify({
      moveUci: randomMove,
      choiceId: 'A',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    submitMoveDuration.add(Date.now() - startTime);
    
    const success = check(moveRes, {
      'submit move status is 200': (r) => r.status === 200,
      'move response has feedback': (r) => {
        const body = JSON.parse(r.body);
        return !!body.feedback;
      },
      'move response has newFen': (r) => {
        const body = JSON.parse(r.body);
        return !!body.newFen;
      },
    });
    
    errorRate.add(!success);
  });
  
  sleep(2); // Simulate reading feedback
}

export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const { metrics } = data;
  
  let output = '\n=== Load Test Summary ===\n\n';
  
  output += `Total Requests: ${metrics.http_reqs?.values?.count || 0}\n`;
  output += `Failed Requests: ${metrics.http_req_failed?.values?.passes || 0}\n`;
  output += `Error Rate: ${((metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%\n\n`;
  
  output += `Response Times (p95):\n`;
  output += `  Create Game: ${metrics.create_game_duration?.values?.['p(95)']?.toFixed(0) || 'N/A'}ms\n`;
  output += `  Get Turn: ${metrics.get_turn_duration?.values?.['p(95)']?.toFixed(0) || 'N/A'}ms\n`;
  output += `  Submit Move: ${metrics.submit_move_duration?.values?.['p(95)']?.toFixed(0) || 'N/A'}ms\n`;
  
  return output;
}






