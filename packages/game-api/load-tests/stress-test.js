/**
 * K6 Stress Test: Game API
 * 
 * Finds the breaking point of the system.
 * Gradually increases load until failures occur.
 * 
 * Run: k6 run stress-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const totalErrors = new Counter('total_errors');
const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Below normal load
    { duration: '2m', target: 100 },  // Normal load
    { duration: '2m', target: 200 },  // Around breaking point
    { duration: '2m', target: 300 },  // Beyond breaking point
    { duration: '2m', target: 400 },  // Way beyond
    { duration: '5m', target: 0 },    // Recovery
  ],
  
  thresholds: {
    // We expect failures in stress test - track them
    errors: ['rate<0.30'], // Fail if more than 30% errors
  },
};

const OPENING_MOVES = ['e2e4', 'd2d4', 'g1f3', 'c2c4'];

export default function() {
  // Create game with timeout
  const createRes = http.post(`${BASE_URL}/game`, JSON.stringify({
    userElo: 1200,
  }), {
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s',
  });
  
  if (createRes.status !== 200) {
    errorRate.add(true);
    totalErrors.add(1);
    return;
  }
  
  errorRate.add(false);
  const gameId = JSON.parse(createRes.body).gameId;
  
  sleep(0.2);
  
  // Get turn
  const turnRes = http.get(`${BASE_URL}/game/${gameId}/turn`, {
    timeout: '30s',
  });
  
  if (turnRes.status !== 200) {
    errorRate.add(true);
    totalErrors.add(1);
    return;
  }
  
  errorRate.add(false);
  
  sleep(0.5);
  
  // Submit move
  const moveRes = http.post(`${BASE_URL}/game/${gameId}/move`, JSON.stringify({
    moveUci: OPENING_MOVES[Math.floor(Math.random() * OPENING_MOVES.length)],
    choiceId: 'A',
  }), {
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s',
  });
  
  if (moveRes.status !== 200) {
    errorRate.add(true);
    totalErrors.add(1);
    return;
  }
  
  errorRate.add(false);
  
  sleep(1);
}

export function handleSummary(data) {
  const { metrics } = data;
  
  console.log('\n=== STRESS TEST RESULTS ===\n');
  console.log(`Peak VUs: ${data.metrics.vus_max?.values?.max || 'N/A'}`);
  console.log(`Total Requests: ${metrics.http_reqs?.values?.count || 0}`);
  console.log(`Total Errors: ${metrics.total_errors?.values?.count || 0}`);
  console.log(`Error Rate: ${((metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%`);
  console.log(`\nResponse Time p95: ${metrics.http_req_duration?.values?.['p(95)']?.toFixed(0) || 'N/A'}ms`);
  console.log(`Response Time p99: ${metrics.http_req_duration?.values?.['p(99)']?.toFixed(0) || 'N/A'}ms`);
  
  // Determine breaking point
  if (metrics.errors?.values?.rate > 0.1) {
    console.log('\n⚠️  System showed stress at this load level');
  } else {
    console.log('\n✅ System handled load without significant stress');
  }
  
  return {
    'stress-test-summary.json': JSON.stringify(data, null, 2),
  };
}


