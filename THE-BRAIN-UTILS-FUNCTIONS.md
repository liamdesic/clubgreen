# ClubGreen Utility Functions

## Overview
This document serves as the single source of truth for all utility functions in the ClubGreen application. Each utility is designed to be reusable, well-documented, and follow consistent patterns.

## Core Utilities

### `codeUtils.ts`
**Purpose**: Handles generation, validation, and management of codes and UUIDs used throughout the application.

**Exports**:
- `generateShortCode(length = 7)`: Generates a random alphanumeric code (excludes ambiguous chars)
- `generateAccessUUID()`: Generates a secure UUID v4
- `generateUniqueShortCode(length = 7)`: Generates a short code that doesn't exist in the database
- `generateUniqueAccessUUID()`: Generates a UUID that doesn't exist in the database
- `generateUniqueOrgLeaderboardCode(length = 7)`: Generates a unique org leaderboard code
- `isValidShortCode(code)`: Validates short code format
- `isValidAccessUUID(uuid)`: Validates UUID format
- `parseCodeAndUUID(combined)`: Parses combined code-uuid strings
- `shortCodeExists(code)`: Checks if a short code exists in the database
- `accessUUIDExists(uuid)`: Checks if a UUID exists in the database
- `orgLeaderboardCodeExists(code)`: Checks if an org leaderboard code exists

### `eventStatus.ts`
**Purpose**: Determines and formats the status of events based on dates and score data.

**Exports**:
- `getEventStatus(event, scoreCount = 0)`: Returns an EventStatus object with:
  - `code`: Numeric status code
  - `label`: Human-readable status
  - `isLive`: Boolean indicating if event is live
  - `color`: Color code for UI

### `generalUtils.ts`
**Purpose**: General-purpose utility functions used across the application.

**Exports**:
- `formatDateTime(date)`: Formats date to "8 Jun 2025, 3:00 PM"
- `getRelativeTime(date)`: Returns relative time string (e.g., "2 hours ago")
- `isToday(date)`: Checks if date is today
- `isThisWeek(date)`: Checks if date is in current week
- `groupBy(arr, key)`: Groups array items by key or key function
- `sortBy(arr, selector, direction)`: Sorts array by selector function
- `filterBy(arr, predicate)`: Filters array by predicate function
- `truncateText(text, maxLength)`: Truncates text with ellipsis
- `debounce(fn, delay)`: Creates a debounced function

### `jsonUtils.ts`
**Purpose**: JSON parsing and stringification utilities with error handling.

**Exports**:
- `safeStringify(data)`: Safely stringifies JSON with error handling
- `safeParse(json)`: Safely parses JSON with error handling

### `timeFiltersUtils.ts`
**Purpose**: Utilities for working with time-based filters.

**Exports**:
- `getTimeRangeCutoff(timeRange)`: Gets cutoff timestamp for a time range
- `getTimeRangeLabel(timeRange)`: Gets human-readable label for time range

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

