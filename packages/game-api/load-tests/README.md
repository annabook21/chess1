# Load Testing

This directory contains load tests for the Game API.

## Prerequisites

Install k6 (load testing tool):

```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Running Load Tests

```bash
# Basic load test
k6 run game-api.js

# With more virtual users
k6 run --vus 50 --duration 60s game-api.js

# With environment-specific URL
k6 run -e API_URL=https://api.yourdomain.com game-api.js
```

## Test Scenarios

1. **game-api.js** - Full game flow load test
2. **spike-test.js** - Sudden traffic spike simulation
3. **stress-test.js** - Find breaking point
4. **soak-test.js** - Extended duration test

## Metrics to Watch

- `http_req_duration` - Response time (p95 should be < 500ms)
- `http_req_failed` - Error rate (should be < 1%)
- `iterations` - Requests per second
- `vus` - Concurrent virtual users









