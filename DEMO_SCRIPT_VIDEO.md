# Master Academy Chess - Video Demo Script

> **Audience**: Diverse professionals (engineers, architects, product managers, executives)  
> **Duration**: ~25 minutes  
> **Format**: Video demonstration with screen recording  
> **Demo URL**: https://duh6gs2t2ir6g.cloudfront.net

---

## ACT I: The Experience (5 minutes)

### Scene 1: Opening Hook

*[Show the app landing screen with the Sierra-style retro aesthetic]*

> "Welcome to Master Academy Chess — an AI-powered chess learning platform that combines classic game aesthetics with cutting-edge machine learning. 
>
> Before we dive into the technical architecture, let me show you what makes this experience special."

### Scene 2: Live Gameplay Demo

*[Play through a quick game, showing key features]*

**What to demonstrate:**
1. Start a new game — show the retro aesthetic
2. Make a move in Guided Mode — show AI suggestions
3. Switch to Free Mode — show direct piece movement
4. Trigger a blunder — show spirit narrator reaction
5. Enable "Predict Opponent" — show Maia predictions

**What to say:**
> "As you can see, the app provides real-time feedback, AI-powered move suggestions, and a gamified learning experience. But what makes this technically interesting is how we handle the data behind the scenes — especially when pieces are moving in real-time."

---

## ACT II: The Challenge (2 minutes)

### Scene 3: Setting the Stage

*[Show a simple diagram of user → app → database]*

> "Every time a player makes a move, we need to:
> 1. Save the new board position instantly
> 2. Update the game state in our database
> 3. Retrieve the latest state when the page refreshes
> 4. List all of a user's games when they visit their dashboard
>
> These operations happen **hundreds of times per second** across all our users. If the database is slow, the game feels sluggish. If it's expensive, we can't scale.
>
> Today, I'm going to show you how we solved this using Amazon DynamoDB — and specifically, how we designed our primary key and sort key structure to make every query fast and cost-effective."

---

## ACT III: DynamoDB Design Deep-Dive (8 minutes)

*[Show the DynamoDB diagram — see `DYNAMODB_DIAGRAM.md`]*

### Scene 4: Understanding the Problem

> "Before we designed our database, we had to answer one critical question: **What queries do we need to run?**
>
> Let me show you our five access patterns — these are the questions our app needs to answer:"

*[Show table on screen]*

| Question | When It Happens | How Fast? |
|---------|----------------|-----------|
| **Get a specific game** | Every move, every page load | Must be instant (<10ms) |
| **Update a game after a move** | Every single move | Must be instant (<10ms) |
| **List a user's recent games** | Dashboard load | Can be slightly slower (<50ms) |
| **Create a new game** | Starting a game | Can be slower (<100ms) |
| **Find active games** | Resume game flow | Can be slightly slower (<50ms) |

> "Notice that the first two — getting and updating a game — happen on **every single move**. This is what we call the 'hot path.' When a piece lands on a square, we need sub-10 millisecond database response, or the UI feels sluggish.
>
> This is why our database design matters so much."

### Scene 5: The Primary Key Decision

*[Show the diagram comparing Option A vs Option B]*

> "In DynamoDB, every table needs a **Primary Key** — think of it as the unique identifier for each record. We had two options:

**Option A: Use the User ID as the Primary Key**

> "At first glance, this seems logical. Group all games by user, right? But here's the problem:
>
> - If one power user has 1,000 games, all those games live in the same partition. That creates a 'hot partition' — one user's data becomes a bottleneck.
> - To look up a specific game, we'd need BOTH the user ID AND the game ID. But when someone shares a game link, we only have the game ID in the URL.
> - User IDs have lower cardinality — fewer unique users than unique games. This means less even distribution of data."

**Option B: Use the Game ID as the Primary Key (Our Choice)**

> "We chose to use the Game ID as the primary key. Here's why:
>
> - **Perfect distribution**: Each game is a unique partition key. This means perfect horizontal scaling — no hot partitions, no bottlenecks.
> - **Single-key lookup**: To get a game, we only need the game ID. One key, one operation, fastest possible query.
> - **URL-friendly**: Game URLs are `/game/{gameId}` — no need to know the user ID.
>
> Think of it like this: if you have a library, do you organize books by author or by book ID? For fast lookups, you want the book ID — that's what we did."

*[Show example query on screen]*

> "Here's what that looks like in code. To get a game, we simply say: 'Give me the game with ID abc123.' That's it. One key, one operation, 3-8 milliseconds consistently, regardless of how many games are in the table."

### Scene 6: The Sort Key Solution

*[Show the GSI diagram]*

> "But wait — if Game ID is the primary key, how do we answer the question: 'Show me all games for user X'? 
>
> This is where DynamoDB's **Global Secondary Index**, or GSI, comes in. Think of it as a second way to look up the same data, organized differently.
>
> We created an index called 'ByUserV2' where:
> - The **partition key** is the User ID
> - The **sort key** is the Updated At timestamp
>
> This gives us two ways to access the same data:
> 1. By Game ID (primary table) — for fast game lookups
> 2. By User ID (GSI) — for listing a user's games"

*[Show visual example]*

> "Here's a concrete example. Let's say we have three games in our database:"

*[Show table with example data]*

```
Primary Table (by Game ID):
┌──────────┬──────────┬─────────────────────┐
│ Game ID  │ User ID  │ Updated At          │
├──────────┼──────────┼─────────────────────┤
│ game-001 │ user-123 │ 2024-01-15 10:30:00 │
│ game-002 │ user-456 │ 2024-01-15 11:00:00 │
│ game-003 │ user-123 │ 2024-01-15 12:00:00 │
└──────────┴──────────┴─────────────────────┘

GSI "ByUserV2" (by User ID, sorted by Updated At):
┌──────────┬──────────┬─────────────────────┐
│ User ID  │ Updated At│ Game ID             │
├──────────┼───────────┼─────────────────────┤
│ user-123 │ 2024-01-15 12:00:00 │ game-003 │ ← Most recent
│ user-123 │ 2024-01-15 10:30:00 │ game-001 │
│ user-456 │ 2024-01-15 11:00:00 │ game-002 │
└──────────┴───────────┴─────────────────────┘
```

> "When we want user-123's games, we query the GSI. Because we used 'Updated At' as the sort key, the results come back **already sorted** — most recent first. No client-side sorting needed.
>
> This is the power of the sort key: it turns what would be an expensive 'fetch everything and sort it yourself' operation into a single, fast database query."

### Scene 7: Real-World Query Examples

*[Show code examples side-by-side with results]*

> "Let me show you three real queries and how they work:

**Query 1: Get a specific game (happens on every move)**

> "When a player makes a move, we need to fetch the current game state. This uses the primary table with just the game ID."

```typescript
// Query: Get game "abc123"
Key: { gameId: "abc123" }
Result: Single game record in 3-8ms
```

**Query 2: List user's 10 most recent games (dashboard)**

> "When a user visits their dashboard, we query the GSI. We ask for user-123's games, sorted by most recent, limit 10."

```typescript
// Query: Get user-123's games, most recent first
Index: "ByUserV2"
Key: { userId: "user-123" }
Sort: updatedAt (descending)
Limit: 10
Result: 10 games, already sorted, in 5-15ms
```

**Query 3: Find active games updated in the last hour**

> "To find games that are still active and recently updated, we can use the sort key to filter by time range."

```typescript
// Query: Active games updated after 2:00 PM
Index: "ByUserV2"
Key: { userId: "user-123" }
Sort Key Condition: updatedAt > "2024-01-15T14:00:00Z"
Filter: status = "active"
Result: Only active, recent games
```

> "Notice how the sort key enables time-based filtering without scanning the entire table. This is why choosing the right sort key is so important."

### Scene 8: The Update Mechanism

*[Show update flow diagram]*

> "When a player makes a move, here's what happens:
>
> 1. We update the game's board position (the FEN string)
> 2. We increment the turn number
> 3. **Critically**: We update the 'Updated At' timestamp
>
> Why is that last step important? Because 'Updated At' is our sort key in the GSI. Every time we update it, that game automatically 'bubbles to the top' of the user's game list. The most recently played game appears first — no manual re-sorting needed.
>
> We also use **optimistic locking** with a version number. This prevents race conditions if someone tries to make a move from two browser tabs at the same time. If the version doesn't match, we reject the update and refresh the game state."

### Scene 9: Cost Optimization

*[Show comparison table]*

> "Finally, let's talk about cost. DynamoDB charges based on data size. We use a technique called 'sparse projection' on our GSI — we only store the fields we actually need for listing games.
>
> For the game list, we need:
> - Game ID
> - Status (active/completed)
> - Turn number
> - Opponent style
> - Last evaluation
>
> We **don't** store:
> - The full board position (FEN) — that's 90 bytes, only needed when loading a game
> - The version number — only used during updates
>
> This reduces our GSI storage by 60%, which means lower costs and faster queries."

*[Show cost comparison]*

| Approach | Storage per Game | Cost Impact |
|----------|-----------------|-------------|
| Store everything | ~150 bytes | Higher cost, slower |
| Sparse projection (ours) | ~60 bytes | 60% reduction |

---

## ACT IV: Maia Neural Network - Client-Side AI (3 minutes)

*[Show the app in "Predict Opponent" mode]*

### Scene 10: What is Maia?

> "Now let's talk about one of the most interesting technical features: **Maia**, a neural network that runs entirely in your browser.
>
> Traditional chess engines like Stockfish find the objectively best move — but that's not how humans play. Maia was trained by Microsoft Research on millions of real human games from Lichess. Instead of finding the perfect move, it predicts what a human player of a specific skill level would actually play.
>
> This is revolutionary for chess training. Playing against a perfect engine is frustrating — it makes moves you'd never see in real games. But playing against Maia feels like playing against a real person, because it learned from real people."

### Scene 11: Running AI in the Browser

*[Show DevTools Network tab, filter for ONNX models]*

> "Here's what makes this special: Maia runs **entirely in your browser**. No server calls, no API costs, no latency.
>
> When you first visit the site, we download a 3.5 megabyte neural network model — that's the Maia brain. It's cached for 365 days, so you only download it once. After that, every prediction happens locally in your browser using WebAssembly.
>
> We support nine different skill levels, from 1100 to 1900 Elo rating. Each level has its own model, trained on games from players at that exact skill level. So Maia-1500 plays like a 1500-rated human, making the same kinds of moves and mistakes that a 1500-rated player would make."

### Scene 12: How It Works

*[Show simplified diagram: Position → Neural Network → Move Probabilities]*

> "Here's how it works in simple terms:
>
> 1. We take the current chess position and encode it into a format the neural network understands — 112 different 'planes' of information about the board.
> 2. The neural network processes this and outputs probabilities for all 1,858 possible moves.
> 3. We use temperature-based sampling to pick a move — not always the most likely, but weighted by probability. This makes each game feel different and realistic.
> 4. The whole process takes 50 to 200 milliseconds, running entirely in your browser.
>
> The result? When you enable 'Predict Opponent' mode, you're trying to guess what a human would play — not what a perfect computer would play. This trains you to read human opponents, which is what you'll face in real games."

---

## ACT V: AWS Architecture Overview (4 minutes)

*[Show architecture diagram]*

### Scene 13: The Big Picture

> "Let me give you a high-level overview of how everything fits together on AWS. We use a serverless microservices architecture — that means no servers to manage, automatic scaling, and you only pay for what you use."

### Scene 14: Service Breakdown

*[Show service diagram with labels]*

> "Here's what each service does:

**CloudFront + S3** — The Front Door
> "All static assets — HTML, CSS, JavaScript, and those 3.5MB Maia models — are served from S3 through CloudFront, Amazon's content delivery network. This gives us global distribution and fast load times."

**Application Load Balancer (ALB)** — The Traffic Director
> "The ALB routes incoming requests to the right service based on the URL path. Game requests go to game-api, engine analysis goes to engine-service, and so on."

**game-api** — The Orchestrator
> "This is the main service that coordinates everything. It handles game state, move validation, and talks to all the other services. We run two copies for high availability."

**engine-service** — The Chess Brain
> "This wraps Stockfish, the open-source chess engine. When we need to analyze a position or find the best move, this service does the heavy computational work. It needs more CPU and memory because chess analysis is compute-intensive."

**style-service** — The Personality Engine
> "When you're playing against an AI Master like Tal or Karpov, this service uses Amazon Bedrock to generate moves that match that master's playing style. It takes the current position and asks Claude: 'What would Tal play here?'"

**coach-service** — The Teacher
> "This generates educational explanations for your moves. It also uses Bedrock to provide personalized feedback based on your skill level."

**drill-worker** — The Background Processor
> "This runs asynchronously, processing blunder events from a queue. When you make a mistake, we send it to a queue, and this worker processes it later. This keeps the main game flow fast — you don't wait for blunder analysis."

**DynamoDB** — The Database
> "We already covered this in detail, but this is where all game state lives. Fast, scalable, serverless."

**SQS** — The Message Queue
> "We use Amazon's Simple Queue Service to decouple time-consuming operations from the main request path. Blunder analysis doesn't block your move."

**Cloud Map** — Service Discovery
> "Services find each other using private DNS names like 'engine.chess.local'. No hardcoded IP addresses, no configuration files — everything just works."

### Scene 15: Why This Architecture?

> "Why did we choose this design?
>
> **Serverless**: All services run on ECS Fargate — no EC2 instances to manage, no servers to patch. AWS handles the infrastructure.
>
> **Scalable**: If we get a traffic spike, services automatically scale up. If traffic drops, they scale down. We only pay for what we use.
>
> **Resilient**: If one service fails, others keep running. We have multiple copies of critical services.
>
> **Cost-Effective**: For a thousand daily active users, this entire infrastructure costs about $166 per month. That includes compute, database, AI services, and CDN."

---

## ACT VI: Technical Stack (2 minutes)

*[Show technology stack diagram]*

### Scene 16: Frontend Technologies

> "On the frontend, we use modern web technologies:

**React 18 with TypeScript** — The UI Framework
> "React gives us component-based architecture and reactive updates. TypeScript catches errors before they reach production."

**Vite** — The Build Tool
> "Vite provides lightning-fast development and optimized production builds. It's much faster than traditional bundlers."

**XState** — State Management (Infrastructure Ready)
> "We've built XState infrastructure for managing complex game state with state machines. This provides predictable state transitions and makes the game logic easier to reason about. Currently, we're using React hooks and Context for state management, but the XState foundation is ready for migration."

**ONNX Runtime Web** — Neural Network Execution
> "This runs the Maia models in the browser using WebAssembly. It's the same technology used by major ML frameworks, optimized for browser performance."

**chess.js** — Chess Logic
> "This library handles all the chess rules — move validation, game state, check detection. We use it on both frontend and backend for consistency."

**CSS Modules + CSS Variables** — Styling
> "We use CSS Modules for component-scoped styles and CSS Variables for theming. The retro Sierra VGA aesthetic is all pure CSS — no images, no WebGL, just clever CSS effects."

### Scene 17: Backend Technologies

> "On the backend:

**Node.js + TypeScript** — Runtime
> "All our services are written in TypeScript and run on Node.js. This gives us type safety and modern JavaScript features across the entire stack."

**AWS CDK** — Infrastructure as Code
> "We define all our AWS resources using TypeScript code. This means infrastructure is version-controlled, reviewable, and reproducible."

**ECS Fargate** — Container Orchestration
> "All services run in containers on Fargate. No EC2 management, automatic scaling, pay-per-use."

**DynamoDB** — Database
> "As we discussed, DynamoDB provides the fast, scalable data layer."

**Amazon Bedrock** — AI Services
> "We use Claude Sonnet through Bedrock for generating master-style moves and educational feedback. Bedrock provides a unified API for multiple AI models."

---

## ACT VII: The Results (2 minutes)

### Scene 18: Performance Summary

*[Show performance metrics]*

> "So what did we achieve with this design?

| Operation | Speed | Cost |
|-----------|-------|------|
| Get a game | 3-8ms | 0.5-1 read unit |
| Update a game | 5-10ms | 1 write unit |
| List user's games | 5-15ms | 0.5-1 read unit |

> "Every access pattern is either a single-item lookup or a targeted query. No table scans, no hot partitions, no performance bottlenecks.
>
> This design scales from 10 users to 10 million users without any code changes. That's the power of thinking carefully about your primary key and sort key structure."

---

## ACT VIII: Closing & Q&A (3 minutes)

### Scene 19: Key Takeaways

> "To summarize what we've learned:
>
> 1. **Start with access patterns** — know what questions you need to answer before designing your table
> 2. **Choose your primary key for the hot path** — optimize for your most frequent queries
> 3. **Use GSIs for alternate access patterns** — but design them carefully with sort keys
> 4. **Leverage sort keys for pre-sorted results** — let the database do the sorting, not your application
> 5. **Optimize storage with sparse projections** — only store what you need in indexes
>
> These principles apply to any DynamoDB table, not just chess games. Whether you're storing user sessions, product catalogs, or financial transactions, the same design thinking applies."

### Scene 20: Questions

> "I'd be happy to answer any questions about our DynamoDB design, or dive deeper into any of the other technical aspects of Master Academy Chess."

---

## Visual Aids Checklist

- [ ] DynamoDB structure diagram (see `DYNAMODB_DIAGRAM.md`)
- [ ] Example data table showing primary key vs GSI
- [ ] Query flow diagram
- [ ] Performance metrics chart
- [ ] Cost comparison table
- [ ] Maia neural network flow diagram
- [ ] AWS architecture diagram showing all services
- [ ] Technology stack diagram

---

## Notes for Presenter

1. **Pacing**: The DynamoDB section is the technical deep-dive. Speak slowly and clearly. Use the visual diagram to support your explanation.

2. **Analogies**: Use the library/book analogy for primary keys. Use the "two filing systems" analogy for GSIs.

3. **Examples**: Always show concrete examples with real game IDs and timestamps. Abstract concepts are harder to follow.

4. **Transitions**: Use phrases like "But wait..." and "Here's the key insight..." to maintain engagement.

5. **Visual Cues**: When showing code, highlight the specific lines you're discussing. When showing diagrams, point to the relevant sections.
