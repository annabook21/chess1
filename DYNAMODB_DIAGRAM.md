# DynamoDB Primary Key / Sort Key Structure Diagram

This diagram illustrates the DynamoDB table design for Master Academy Chess, showing how the primary key and Global Secondary Index (GSI) work together.

---

## Table Structure Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MasterAcademy-GameSessions                          │
│                                                                          │
│  Primary Table (Partition Key: gameId)                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ PK: gameId (String)                                              │  │
│  │                                                                   │  │
│  │ Example Records:                                                  │  │
│  │ ┌──────────┬──────────┬──────────┬──────────┬────────────────┐ │  │
│  │ │ gameId   │ userId   │ fen      │ status   │ updatedAt      │ │  │
│  │ ├──────────┼──────────┼──────────┼──────────┼────────────────┤ │  │
│  │ │ game-001 │ user-123 │ rnbqkb...│ active   │ 2024-01-15... │ │  │
│  │ │ game-002 │ user-456 │ rnbqkb...│ completed│ 2024-01-15... │ │  │
│  │ │ game-003 │ user-123 │ rnbqkb...│ active   │ 2024-01-15... │ │  │
│  │ └──────────┴──────────┴──────────┴──────────┴────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Global Secondary Index: "ByUserV2"                                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ PK: userId (String)                                               │  │
│  │ SK: updatedAt (String, ISO-8601)                                 │  │
│  │                                                                   │  │
│  │ Example Records (sorted by updatedAt, descending):               │  │
│  │ ┌──────────┬────────────────────┬──────────┬──────────┬────────┐ │  │
│  │ │ userId    │ updatedAt (SK)   │ gameId   │ status   │ turns  │ │  │
│  │ ├──────────┼────────────────────┼──────────┼──────────┼────────┤ │  │
│  │ │ user-123 │ 2024-01-15 12:00:00│ game-003 │ active   │ 15     │ │  │
│  │ │ user-123 │ 2024-01-15 10:30:00│ game-001 │ active   │ 8      │ │  │
│  │ │ user-456 │ 2024-01-15 11:00:00│ game-002 │ completed│ 42     │ │  │
│  │ └──────────┴────────────────────┴──────────┴──────────┴────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Query Examples

### Example 1: Get a Specific Game (Primary Table)

**Use Case**: Player makes a move, need to fetch current game state

```
Query: GetItem
Table: MasterAcademy-GameSessions
Key: { gameId: "game-003" }

Result:
{
  gameId: "game-003",
  userId: "user-123",
  fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  status: "active",
  turnNumber: 15,
  updatedAt: "2024-01-15T12:00:00Z"
}

Latency: 3-8ms
Cost: 0.5-1 RCU (Read Capacity Unit)
```

**Visual Flow:**
```
User Request: "Get game-003"
        │
        ▼
┌──────────────────┐
│  Primary Table   │
│  (by gameId)     │
└──────────────────┘
        │
        ▼
   Single Item
   (3-8ms)
```

---

### Example 2: List User's Recent Games (GSI)

**Use Case**: User visits dashboard, wants to see their 10 most recent games

```
Query: Query
Table: MasterAcademy-GameSessions
Index: ByUserV2
KeyConditionExpression: userId = :userId
ExpressionAttributeValues: { ":userId": "user-123" }
ScanIndexForward: false  // Descending order (most recent first)
Limit: 10

Result: [
  {
    gameId: "game-003",
    status: "active",
    updatedAt: "2024-01-15T12:00:00Z",
    turnNumber: 15,
    opponentStyle: "karpov"
  },
  {
    gameId: "game-001",
    status: "active",
    updatedAt: "2024-01-15T10:30:00Z",
    turnNumber: 8,
    opponentStyle: "tal"
  }
]

Latency: 5-15ms
Cost: 0.5-1 RCU
```

**Visual Flow:**
```
User Request: "Get user-123's games, most recent first"
        │
        ▼
┌──────────────────┐
│  GSI: ByUserV2   │
│  (by userId)     │
└──────────────────┘
        │
        ▼
   Sorted Results
   (already sorted by updatedAt)
   (5-15ms)
```

---

### Example 3: Find Active Games Updated Recently (GSI with Filter)

**Use Case**: Find user's active games that were updated in the last hour

```
Query: Query
Table: MasterAcademy-GameSessions
Index: ByUserV2
KeyConditionExpression: 
  userId = :userId AND updatedAt > :cutoff
ExpressionAttributeValues: {
  ":userId": "user-123",
  ":cutoff": "2024-01-15T11:00:00Z"
}
FilterExpression: #status = :active
ExpressionAttributeNames: { "#status": "status" }
ExpressionAttributeValues: { ":active": "active" }

Result: [
  {
    gameId: "game-003",
    status: "active",
    updatedAt: "2024-01-15T12:00:00Z"
  }
]

Latency: 5-15ms
Cost: 0.5-1 RCU
```

**Visual Flow:**
```
User Request: "Get user-123's active games updated after 11:00 AM"
        │
        ▼
┌──────────────────┐
│  GSI: ByUserV2   │
│  (by userId)     │
└──────────────────┘
        │
        ▼
   Filter by:
   - updatedAt > cutoff (sort key)
   - status = "active" (filter)
   (5-15ms)
```

---

## Why This Design Works

### Primary Key: `gameId`

✅ **Perfect Distribution**: Each game is a unique partition = no hot partitions  
✅ **Single-Key Lookup**: Fastest possible query (GetItem)  
✅ **URL-Friendly**: Game URLs only need gameId  

### GSI Sort Key: `updatedAt`

✅ **Pre-Sorted Results**: DynamoDB sorts by timestamp automatically  
✅ **Time-Based Queries**: Can filter by date ranges efficiently  
✅ **Auto-Bubbling**: Updates automatically move games to top of list  

### Sparse Projection

✅ **Cost Savings**: Only store needed fields in GSI (60% reduction)  
✅ **Faster Scans**: Smaller items = faster queries  
✅ **Selective Loading**: Full game data only loaded when needed  

---

## Comparison: With vs Without Sort Key

### Without Sort Key (userId only)

```
Query: Get user-123's 10 most recent games

1. Query GSI by userId → Get ALL games for user-123
2. Sort by updatedAt in application code
3. Take first 10

Problems:
- Must fetch ALL games (could be 100+)
- Client-side sorting is slow
- Higher read costs
```

### With Sort Key (userId + updatedAt)

```
Query: Get user-123's 10 most recent games

1. Query GSI by userId, sorted by updatedAt (descending)
2. Limit: 10
3. DynamoDB returns pre-sorted results

Benefits:
- Only fetch 10 games
- No client-side sorting needed
- Lower read costs
- Faster response time
```

---

## Real-World Example: Game Update Flow

```
1. User makes move: e2e4
        │
        ▼
2. Update Primary Table:
   - Update fen (new board position)
   - Increment turnNumber: 8 → 9
   - Update updatedAt: "2024-01-15T10:30:00Z" → "2024-01-15T10:31:00Z"
   - Increment version: 8 → 9 (optimistic locking)
        │
        ▼
3. GSI Automatically Updates:
   - Same record appears in GSI
   - Now sorted by new updatedAt timestamp
   - Game "bubbles to top" of user's game list
        │
        ▼
4. Next Dashboard Load:
   - Query GSI for user's games
   - Most recent game (just updated) appears first
   - No manual sorting needed!
```

---

## Key Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| **Primary Table Lookup** | 3-8ms | Single GetItem by gameId |
| **GSI Query** | 5-15ms | Query by userId, sorted by updatedAt |
| **Storage per Game (Primary)** | ~200 bytes | Minimal record |
| **Storage per Game (GSI)** | ~60 bytes | Sparse projection (60% reduction) |
| **Read Cost (GetItem)** | 0.5-1 RCU | Depends on item size |
| **Write Cost (UpdateItem)** | 1 WCU | Standard write operation |

---

## Visual Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    Access Patterns                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Pattern 1: Get Game by ID                                 │
│  ┌──────────┐         ┌──────────┐         ┌──────────┐   │
│  │   User   │────────▶│ game-api │────────▶│ Primary  │   │
│  │ Request  │         │          │         │ Table    │   │
│  │ game-003 │         │          │         │ (gameId)  │   │
│  └──────────┘         └──────────┘         └──────────┘   │
│                                                              │
│  Pattern 2: List User's Games                              │
│  ┌──────────┐         ┌──────────┐         ┌──────────┐   │
│  │   User   │────────▶│ game-api │────────▶│   GSI    │   │
│  │ Request  │         │          │         │ ByUserV2 │   │
│  │ user-123 │         │          │         │ (userId)  │   │
│  └──────────┘         └──────────┘         └──────────┘   │
│                                                              │
│  Pattern 3: Update Game                                    │
│  ┌──────────┐         ┌──────────┐         ┌──────────┐   │
│  │   User   │────────▶│ game-api │────────▶│ Primary  │   │
│  │  Move    │         │          │         │ Table    │   │
│  │ e2e4     │         │          │         │ (gameId)  │   │
│  └──────────┘         └──────────┘         └──────────┘   │
│                                │                            │
│                                ▼                            │
│                         ┌──────────┐                        │
│                         │   GSI    │                        │
│                         │ ByUserV2 │                        │
│                         │ (auto)   │                        │
│                         └──────────┘                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Code Snippets for Reference

### Get Game by ID (Primary Table)

```typescript
const result = await docClient.send(new GetCommand({
  TableName: 'MasterAcademy-GameSessions',
  Key: { gameId: 'game-003' }
}));
```

### List User's Games (GSI)

```typescript
const result = await docClient.send(new QueryCommand({
  TableName: 'MasterAcademy-GameSessions',
  IndexName: 'ByUserV2',
  KeyConditionExpression: 'userId = :userId',
  ExpressionAttributeValues: { ':userId': 'user-123' },
  ScanIndexForward: false, // Descending (most recent first)
  Limit: 10
}));
```

### Update Game (Primary Table)

```typescript
const result = await docClient.send(new UpdateCommand({
  TableName: 'MasterAcademy-GameSessions',
  Key: { gameId: 'game-003' },
  UpdateExpression: 'SET fen = :fen, turnNumber = :turn, updatedAt = :now, #version = :newVersion',
  ConditionExpression: '#version = :expectedVersion',
  ExpressionAttributeNames: { '#version': 'version' },
  ExpressionAttributeValues: {
    ':fen': newFen,
    ':turn': newTurnNumber,
    ':now': new Date().toISOString(),
    ':expectedVersion': currentVersion,
    ':newVersion': currentVersion + 1
  }
}));
```
