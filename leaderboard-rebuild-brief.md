ClubGreen Leaderboard Rebuild – Architecture Brief
Version: 2.1
Updated: 2025-06-09

This document outlines the finalized architecture for the ClubGreen leaderboard system, now running on a snapshot-based model powered by Supabase Edge Functions. It is designed for zero-interaction public displays, automatically rotating between live events and time filters, with real-time updates and scalable performance.

✅ Purpose
A fully modular, scalable leaderboard system for ClubGreen that:

Rotates between events + time filters unattended

Runs indefinitely on TV displays with zero user input

Updates in near real-time after scores are submitted

Performs efficiently across large datasets

Uses a lightweight precomputed leaderboard_snapshot table

🧠 System Architecture
🔁 Data Flow (Snapshot Model)
sql
Copy
Edit
Supabase Scorecard Table
       ↓
Edge Function: /update-leaderboard
       ↓
leaderboard_snapshot Table
       ↓
Realtime Subscriptions
       ↓
Leaderboard UI
🧬 Startup Sequence
+page.server.ts: Loads org/event and builds list of Board[]

+page.svelte:

Initializes rotationStore for timing/rotation

Initializes leaderboardViewStore with snapshot preload

UI subscribes to leaderboard_snapshot updates via Supabase Realtime

New scores trigger Edge Function update → snapshot → push to UI

🧱 Key Concepts
📦 What is a Board?

type Board = {
  eventId: string;
  timeFilter: TimeFilter;
}

Each board is one rotating view on the leaderboard screen.

📦 Snapshot Design
Table: leaderboard_snapshot
Each row includes:

ts
Copy
Edit
{
  event_id: string;
  time_filter: TimeFilter;
  scores: PlayerTotalScore[]; // top 10
  updated_at: timestamp;
}
One row per event + time filter combo

JSONB scores array contains names, totals, hole-in-ones, etc.

Only top 10 players per board stored

Fully server-generated via Edge Function

Edge Function: /functions/update-leaderboard
Runs your existing aggregatePlayerScores() logic

Filters scores by time range (getTimeRangeCutoff)

Replaces snapshot row with fresh data

Triggered:

Automatically after score submission

Manually (admin panel or testing)

Optionally on schedule (future)

🔧 Core Modules
File	Role
rotationStore.ts	Tracks list of boards, handles timer, emits currentBoard
leaderboardViewStore.ts	Pulls + caches snapshot per board, subscribes to updates
scoreCalculator.ts	Still used in Edge Function for aggregation
timeFiltersUtils.ts	Maps time filters to timestamps + human-readable labels

🧱 Core Components
Component	Purpose
LeaderboardLayout.svelte	Main wrapper, includes transitions
LeaderboardHeader.svelte	Event/org branding + filter label
LeaderboardScores.svelte	Top 10 dual-column display
LeaderboardSidebar.svelte	QR code + ad panel
TransitionOverlay.svelte	Fade between boards
RotationStatus.svelte	UI indicator for current board + countdown

📍 Page Routing
/ob/[code] → Org View (Rotates Multiple Events)
ts
Copy
Edit
// +page.server.ts
const org = await getOrganizationByCode(params.code);
const events = await getLiveEvents(org.id);
const boards = buildBoardsFromEvents(events);
return { org, boards };

// +page.svelte
rotationStore.initialize(data.boards, data.org.leaderboard_rotation_interval * 1000);
leaderboardViewStore.initializeBoards(data.boards);
/lb/[shortcode] → Single Event View
ts
Copy
Edit
// +page.server.ts
const event = await getEventByShortCode(params.shortcode);
const boards = buildBoardsFromEvent(event);
return { event, boards };

// +page.svelte
rotationStore.initialize(data.boards, 15000);
leaderboardViewStore.initializeBoards(data.boards);
🎨 Styling & Theme System
Uses CSS custom properties (e.g. --accent-color)

Accent color pulled from event.settings_json

Org and event logos shown if present

Responsive layout with sidebar collapse on small screens

🔐 Validation & Types
Uses Zod for all critical validation

Key schemas:

PlayerHoleScore

PlayerTotalScore

Board

TimeFilter

LeaderboardSnapshot

Realtime updates validated via validateLeaderboardSnapshot()

🧪 Performance & Stability
Snapshot system removes heavy lifting from client

Only 10 players per board in-memory

Subscriptions are lightweight and scoped

Optional watchdog reload (e.g. on midnight or crash)

Edge Function executes in <1s even with thousands of rows

🔁 Remaining Tasks
🧠 Score Integration
 Trigger snapshot function on new score submission

 Allow manual re-trigger from admin panel (optional)

🔍 Realtime Flow
 Subscribe client to leaderboard_snapshot

 Update UI from snapshot, not raw scores

 Fallback to client aggregation if snapshot missing

⚙️ Edge Function Utilities
 Add scheduler option for auto-refresh

 Protect with rate limit / throttle guard

 Extend snapshot schema (e.g. flagged, verified)

🛡️ Anti-Cheat (Future)
 Flag suspiciously perfect scores (e.g. all 1s)

 Add score verification queue to admin panel

 Only show verified: true scores if configured

📈 Analytics & Monitoring
 Log Edge Function executions

 Store update_duration for function

 Add optional webhook for monitoring success/failure

🧰 THE-BRAIN Integration
 Add new Edge Function utilities to THE-BRAIN-UTILS

 Document snapshot schema and subscription pattern

 Add examples to THE-BRAIN-TYPES and score validator guides

🚀 Summary
This rebuild uses Edge Function–driven snapshots to power a fast, secure, and scalable leaderboard experience. By decoupling live score ingestion from client rendering, it delivers TV-grade performance with the flexibility to grow into advanced features like anti-cheat and analytics — all backed by a modern Supabase + SvelteKit architecture.