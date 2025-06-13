# Scorecard Area - Club Green

## Routes
- `/[org]/[code]/` - Main scorecard entry
- `/[org]/[code]/test/` - Test scorecard mode

## User Flow
1. Player scans QR code at mini golf hole
2. Mobile scorecard opens with hole number pre-filled
3. Player enters score, submits
4. On game completion: Triggers score calculation
5. Updates `leaderboard_snapshots` via edge function
6. Real-time updates sent to leaderboard displays

## Key Components
- `FileUpload.svelte` - Score entry interface
- `HoleSelector.svelte` - Hole number selection
- Score validation with Zod schemas

## Data Flow
- Score submission → Supabase `player_scores` table
- Edge function calculates aggregated scores
- Updates `leaderboard_snapshots` for all time filters
- Real-time subscriptions notify leaderboard displays

## Validation
- Player name profanity filtering (leo-profanity)
- Score range validation (1-10 typical mini golf)
- Duplicate prevention per hole/player