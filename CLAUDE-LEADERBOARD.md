# Leaderboard Area - Club Green

## Routes
- `/[org]/lb/[shortcode]/` - Single event leaderboard (private parties)
- `/[org]/ob/[org_code]/` - Organization rotation view (all live events)

## Key Components  
- `LeaderboardLayout.svelte` - Main layout wrapper
- `LeaderboardHeader.svelte` - Title and event info
- `LeaderboardScores.svelte` - Score display table
- `LeaderboardRotationStatus.svelte` - Rotation indicator

## Store Architecture
**View Stores**:
- `LeaderboardViewStore.ts` - Score filtering, sorting, display logic
- `RotationStore.ts` - Auto-rotation between events/time filters
- `UIStateStore.ts` - Loading states, error handling

**Source Stores**:
- `scoresSource.ts` - Score data fetching
- `snapshotSource.ts` - Cached leaderboard states
- `eventSource.ts` - Event metadata

## Data Flow
1. Load event/org data on page load
2. Subscribe to `leaderboard_snapshots` for real-time updates  
3. View stores process raw data (filtering, sorting)
4. Auto-rotation cycles through time filters (all-time, daily, weekly)