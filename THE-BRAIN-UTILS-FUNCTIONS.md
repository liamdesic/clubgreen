# ClubGreen Utility Functions

## Overview
This document serves as the single source of truth for all utility functions in the ClubGreen application. Each utility is designed to be reusable, well-documented, and follow consistent patterns.

## Leaderboard System

### Overview
The leaderboard system uses a snapshot-based approach to provide real-time updates with minimal database load. It consists of:

1. **Edge Function (`/supabase/functions/update-leaderboard/`)**
   - Aggregates scores on the server
   - Updates the `leaderboard_snapshot` table
   - Can be triggered manually or via database triggers

2. **Database Table (`leaderboard_snapshot`)**
   - Stores pre-calculated leaderboard data
   - One row per (event_id, time_filter) combination
   - Automatically updated via triggers or scheduled jobs

3. **Client Utilities (`leaderboardUtils.ts`)**
   - Fetch cached leaderboards
   - Trigger updates
   - Subscribe to real-time changes

### Usage Example

```typescript
// Fetch the current leaderboard
const leaderboard = await fetchLeaderboardSnapshot(eventId, 'all_time');

// Trigger an update (e.g., after submitting a score)
await triggerLeaderboardUpdate(eventId, 'all_time');

// Subscribe to real-time updates
const unsubscribe = subscribeToLeaderboardUpdates(eventId, (scores) => {
  console.log('Leaderboard updated:', scores);
});

// Later, to unsubscribe
unsubscribe();
```

## Core Utilities

### `leaderboardUtils.ts`
**Purpose**: Provides utilities for working with the leaderboard snapshot system.

**Exports**:
- `fetchLeaderboardSnapshot(eventId: string, timeFilter: TimeFilter)`: Fetches the cached leaderboard
- `subscribeToLeaderboardUpdates(eventId: string, timeFilter: TimeFilter)`: Subscribes to real-time updates
- `parseLeaderboardScores(scores: unknown)`: Validates and parses leaderboard scores
- `triggerLeaderboardUpdate(eventId: string, timeFilter: TimeFilter)`: Triggers a snapshot update

### `eventUtils.ts`
**Purpose**: Event management and filtering utilities.

**Exports**:
- `getLiveVisibleEventsForOrg(orgId: string)`: Gets all live and visible events for an organization
- `getEventsForOrg(orgId: string)`: Fetches all events for an organization
- `countScoresForEvents(events: Event[])`: Counts scores for a batch of events
- `generateOrgLeaderboardBoards(liveEvents: Event[])`: Generates LeaderboardBoard[] from live events and their time filters

### `jsonUtils.ts`
**Purpose**: Safe JSON parsing utilities with type validation.

**Exports**:
- `parseJSONField<T>(value: unknown, schema: z.ZodType<T>): T | null`: Parse JSON field with Zod schema validation

### `codeUtils.ts`
**Purpose**: Handles generation, validation, and management of codes and UUIDs.

**Exports**:
- `generateShortCode(length = 7)`: Generates a random alphanumeric code
- `generateAccessUUID()`: Generates a secure UUID v4
- `validateOrgLeaderboardCode(orgId: string, code: string)`: Validates if a code belongs to an organization
- `generateUniqueShortCode(length = 7)`: Generates a unique short code
- `generateUniqueAccessUUID()`: Generates a unique UUID
- `generateUniqueOrgLeaderboardCode(length = 7)`: Generates a unique org leaderboard code
- `isValidShortCode(code: string)`: Validates short code format
- `isValidAccessUUID(uuid: string)`: Validates UUID format
- `parseCodeAndUUID(combined: string)`: Parses combined code-uuid strings
- `shortCodeExists(code: string)`: Checks if a short code exists
- `accessUUIDExists(uuid: string)`: Checks if a UUID exists
- `orgLeaderboardCodeExists(code: string)`: Checks if an org leaderboard code exists

### `scoreCalculator.ts`
**Purpose**: Core utilities for score aggregation and leaderboard calculations.

**Exports**:
- `aggregatePlayerScores(holeScores: PlayerHoleScore[], filterFn?: (score: PlayerHoleScore) => boolean)`: Groups and aggregates hole scores
- `sortPlayerScores(scores: PlayerTotalScore[])`: Sorts players by score, hole-in-ones, and name
- `getTopPlayerScores(holeScores: PlayerHoleScore[], limit = 10)`: Gets top N players
- `getPlayerScore(playerId: string, holeScores: PlayerHoleScore[])`: Gets score for one player
- `getPlayerScores(playerIds: string[], holeScores: PlayerHoleScore[])`: Gets scores for multiple players

### `timeFiltersUtils.ts`
**Purpose**: Utilities for working with time-based filters.

**Exports**:
- `getTimeRangeCutoff(timeRange: TimeFilter)`: Gets cutoff timestamp
- `getTimeRangeLabel(timeRange: TimeFilter)`: Gets human-readable label
- `validateTimeFilter(value: unknown)`: Validates time filter value
- `isValidTimeFilter(value: unknown)`: Type guard for time filter

### `eventStatus.ts`
**Purpose**: Determines and formats the status of events.

**Exports**:
- `getEventStatus(event: Event, scoreCount: number = 0)`: Returns EventStatus object
  ```typescript
  type EventStatus = {
    code: number;
    label: string;
    isLive: boolean;
    color: string;
  }
  ```

### `generalUtils.ts`
**Purpose**: General-purpose utility functions.

**Exports**:
- **Date/Time**:
  - `formatDateTime(date: Date | string): string` - Formats date to "8 Jun 2025, 3:00 PM"
  - `getRelativeTime(date: Date | string): string` - Returns "X hours ago" style string
  - `isToday(date: Date | string): boolean` - Checks if date is today
  - `isThisWeek(date: Date | string): boolean` - Checks if date is in current week
- **Array Helpers**:
  - `groupBy<T, K>(arr: T[], key: K | ((item: T) => PropertyKey)): Record<string, T[]>`
  - `sortBy<T>(arr: T[], selector: (item: T) => number | string, direction?: 'asc' | 'desc'): T[]`
  - `filterBy<T>(arr: T[], predicate: (item: T) => boolean): T[]`
- **Text**:
  - `truncateText(text: string, maxLength: number): string` - Truncates with ellipsis
- **Async**:
  - `debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void`

### `toastStore.ts`
**Purpose**: Manages toast notifications.

**Exports**:
- `showToast(options: ToastOptions): void`
  ```typescript
  type ToastOptions = {
    message: string;
    type?: 'success' | 'error' | 'info';
    duration?: number;
  }
  ```
- Helper functions:
  - `showSuccess(message: string, duration?: number): void`
  - `showError(message: string, duration?: number): void`
  - `showInfo(message: string, duration?: number): void`

## Data Validation & Normalization

### `validationUtils.ts`
**Purpose**: Generic validation helpers for Zod schemas.

**Exports**:
- `validate<T>(schema: T, data: unknown)`: Generic validation function
- `validateEvent(data: unknown)`: Validates event data
- `validateOrganization(data: unknown)`: Validates organization data
- `validateScorecard(data: unknown)`: Validates scorecard data
- `validateEventSettings(data: unknown)`: Validates event settings
- `validateOrganizationSettings(data: unknown)`: Validates organization settings

### Data Normalization (`validations.ts`)
**Purpose**: Convert raw database data to application types.

**Exports**:
- `normalizeEvent(raw: any): Event`: Normalizes raw DB event row to canonical Event type
- `fromScorecardRow(row: unknown): Scorecard | null`: Converts database row to Scorecard with error handling

## Store Utilities

### Source Store Helpers
**Purpose**: Data preparation and parsing for source stores.

**Exports**:
- `prepareForSupabase<T>(data: T)`: Convert Date objects to ISO strings for Supabase
- `parseScorecard(data: unknown)`: Safely parse scorecard from unknown input
- `toPlayerHoleScore(scorecard: Scorecard)`: Convert Scorecard to PlayerHoleScore

## Score Management

### `scoreCalculator.ts`
**Purpose**: Core utilities for score aggregation and leaderboard calculations.

**Exports**:
- `aggregatePlayerScores(holeScores, filterFn?)`: Groups and aggregates hole scores by player
- `sortPlayerScores(scores)`: Sorts players by score, hole-in-ones, and name
- `getTopPlayerScores(holeScores, limit = 10)`: Gets top N players with best scores
- `getPlayerScore(playerId, holeScores)`: Gets complete score data for a single player
- `getPlayerScores(playerIds, holeScores)`: Gets scores for multiple players efficiently

### `scorecardUtils.ts`
**Purpose**: Scorecard-specific utilities and helpers.

**Exports**:
- `hasScores(eventId, scoreCounts)`: Checks if an event has any scores
- `getPlayerTotalScore(holeScores)`: Calculates total score from hole scores
- `getPlayerHoleInOnes(holeScores)`: Counts hole-in-ones from hole scores
- `getLastUpdated(holeScores)`: Gets most recent update timestamp from scores

## Score Calculator Utilities

### `scoreCalculator.ts`
Core utilities for score aggregation and leaderboard calculations.

#### Key Functions:

1. **`aggregatePlayerScores(holeScores, filterFn?)`**
   - Groups `PlayerHoleScore[]` by player_id
   - Applies optional filtering via `filterFn`
   - Returns `PlayerTotalScore[]` with aggregated data
   ```typescript
   const allScores = aggregatePlayerScores(holeScores);
   const filtered = aggregatePlayerScores(holeScores, s => s.hole_number <= 9);
   ```

2. **`sortPlayerScores(scores)`**
   - Sorts `PlayerTotalScore[]` by:
     1. `totalScore` (ascending)
     2. `holeInOnes` (descending)
     3. `name` (ascending)
   ```typescript
   const sorted = sortPlayerScores(playerScores);
   ```

3. **`getTopPlayerScores(holeScores, limit = 10)`**
   - Gets top N players with best scores
   - Combines aggregation, sorting, and limiting
   ```typescript
   const top10 = getTopPlayerScores(holeScores);
   ```

4. **`getPlayerScore(playerId, holeScores)`**
   - Gets complete score data for one player
   - Returns `PlayerTotalScore | null`
   ```typescript
   const playerScore = getPlayerScore('player-123', holeScores);
   ```

5. **`getPlayerScores(playerIds, holeScores)`**
   - Efficiently gets scores for specific players
   - Uses `Set` for O(1) lookups
   ```typescript
   const teamScores = getPlayerScores(['p1', 'p2', 'p3'], holeScores);
   ```

#### Deprecated Functions:
- `calculateAndSortScores` → Use `getTopPlayerScores`
- `calculateLeaderboardScores` → Use `aggregatePlayerScores`

### `scorecardUtils.ts`
- **Purpose**: Scorecard-specific utilities and helpers
- **Exports**:
  - `hasScores(eventId, scoreCounts)`: Checks if an event has any scores
  - `getPlayerTotalScore(holeScores)`: Calculates total score from hole scores
  - `getPlayerHoleInOnes(holeScores)`: Counts hole-in-ones from hole scores
  - `getLastUpdated(holeScores)`: Gets most recent update timestamp from scores

### `eventStatus.ts`
- **Purpose**: Determines and formats the status of events
- **Exports**:
  - `getEventStatus(event: Event, scoreCount: number = 0): EventStatus`
    - Returns: `{ code: number, label: string, isLive: boolean, color: string }`
    - Determines if an event is live, upcoming, archived, etc.
  - `type EventStatus`: Type definition for event status objects

### `generalUtils.ts`
- **Location**: `src/lib/utils/`
- **Purpose**: General-purpose utility functions
- **Exports**:
  - **Date/Time**:
    - `formatDateTime(date: Date | string): string` - Formats date to "8 Jun 2025, 3:00 PM"
    - `getRelativeTime(date: Date | string): string` - Returns "X hours ago" style string
    - `isToday(date: Date | string): boolean` - Checks if date is today
    - `isThisWeek(date: Date | string): boolean` - Checks if date is in current week
  - **Array Helpers**:
    - `groupBy<T, K>(arr: T[], key: K | ((item: T) => PropertyKey)): Record<string, T[]>`
    - `sortBy<T>(arr: T[], selector: (item: T) => number | string, direction?: 'asc' | 'desc'): T[]`
    - `filterBy<T>(arr: T[], predicate: (item: T) => boolean): T[]`
  - **Text**:
    - `truncateText(text: string, maxLength: number): string` - Truncates with ellipsis
  - **Async**:
    - `debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void`

### Time Filtering System


### `toastStore.ts`
- **Location**: `src/lib/stores/`
- **Purpose**: Manages toast notifications
- **Exports**:
  - `showToast(options: ToastOptions): void`
    - Options: `{ message: string, type?: 'success' | 'error' | 'info', duration?: number }`
  - Helper functions:
    - `showSuccess(message: string, duration?: number): void`
    - `showError(message: string, duration?: number): void`
    - `showInfo(message: string, duration?: number): void`

