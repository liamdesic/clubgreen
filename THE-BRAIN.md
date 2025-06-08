# ldrboard Codebase Brain

This document serves as the central reference for understanding the ldrboard codebase, its key files, and their functionality.

## Validation Pattern

### Overview

We use a single source of truth for both runtime validation and TypeScript types using Zod schemas. This approach ensures type safety and validation consistency across the application.

### Key Files

- `src/lib/validations.ts`: Contains all Zod schemas and type exports
- `src/lib/database.types.ts`: Auto-generated Supabase types (do not edit manually)

### Core Principles

1. **Single Source of Truth**: All types are derived from Zod schemas using `z.infer<typeof schema>`
2. **Runtime Safety**: All data from external sources is validated at runtime
3. **No Duplication**: Types are never manually defined in multiple places
4. **DB-First**: Database types are the source of truth, with validation schemas matching them

### Usage

```typescript
// Import types and schemas
import { 
  eventSchema, 
  type Event,
  normalizeEvent 
} from '$lib/validations';

// For type annotations
function processEvent(event: Event) {
  // TypeScript knows the shape of event
}

// For runtime validation
function validateEventData(data: unknown): Event {
  return eventSchema.parse(data);
}

// For normalizing DB responses
const event = normalizeEvent(rawDbRow);
```

### Adding New Types

1. Add a new Zod schema in `validations.ts`
2. Export the inferred type: `export type NewType = z.infer<typeof newTypeSchema>`
3. Add any necessary normalization functions
4. Update this documentation if the pattern changes

### Best Practices

- Always use the exported types from `validations.ts`
- Validate all external data before using it
- Use the provided normalization functions for DB responses
- Keep schemas in sync with your database schema
- Add validation for all required fields
- Use `.optional()` for nullable fields
- Add `.describe()` to schemas for documentation

## Data Validation

### `src/lib/validations.ts`

**Purpose**: Central location for all data validation schemas and types using Zod. Serves as the single source of truth for both runtime validation and TypeScript types.

**Key Exports**:

1. **Core Schemas**:
   - `eventSchema`: Validates event data
   - `organizationSchema`: Validates organization data
   - `scorecardSchema`: Validates scorecard data
   - `playerScoreSchema`: Validates player score data
   - `eventLogSchema`: Validates event log entries

2. **Type Exports**:
   - `Event`: Type inferred from `eventSchema`
   - `Organization`: Type inferred from `organizationSchema`
   - `Scorecard`: Type inferred from `scorecardSchema`
   - `PlayerScore`: Type inferred from `playerScoreSchema`
   - `EventLog`: Type inferred from `eventLogSchema`

3. **Utility Functions**:
   - `normalizeEvent()`: Normalizes raw event data from the database
   - `validate()`: Generic validation function for any schema

**Usage Example**:
```typescript
import { eventSchema, type Event, normalizeEvent } from '$lib/validations';

// Type safety
function processEvent(event: Event) {
  // ...
}

// Runtime validation
const validated = eventSchema.parse(rawData);

// Normalize DB response
const event = normalizeEvent(dbRow);
```

## Utility Functions

### `src/lib/utils/codeUtils.ts`

**Purpose**: Handles generation and validation of codes and UUIDs used throughout the application.

**Key Exports**:
- `generateShortCode(length)`: Generates a random alphanumeric code
- `generateAccessUUID()`: Generates a UUID v4
- `generateUniqueShortCode(length)`: Generates a unique short code (checks DB)
- `generateUniqueAccessUUID()`: Generates a unique UUID (checks DB)
- `isValidShortCode(code)`: Validates short code format
- `isValidAccessUUID(uuid)`: Validates UUID format
- `parseCodeAndUUID(combined)`: Parses combined code-uuid strings

### `src/lib/utils/eventStatus.ts`

**Purpose**: Determines and manages event statuses with appropriate styling.

**Key Exports**:
- `getEventStatus(event, scoreCount)`: Returns status object with:
  - `code`: Numeric status code
  - `label`: Human-readable status
  - `isLive`: Boolean for live status
  - `color`: Status color code

### `src/lib/utils/generalUtils.ts`

**Purpose**: General-purpose utility functions for common operations.

**Key Exports**:
- `formatDateTime(date)`: Formats date to human-readable string
- `getRelativeTime(date)`: Returns relative time string (e.g., "2 hours ago")
- `isToday(date)`: Checks if date is today
- `isThisWeek(date)`: Checks if date is in current week
- `groupBy(arr, key)`: Groups array by key or function
- `sortBy(arr, selector, direction)`: Sorts array by property/function
- `filterBy(arr, predicate)`: Filters array with type safety
- `truncateText(text, maxLength)`: Truncates text with ellipsis

### `src/lib/stores/toastStore.ts`

**Purpose**: Manages toast notifications throughout the application with type safety and consistent behavior.

**Key Exports**:
- `toasts`: Svelte store containing the array of active toasts
- `showToast(message, type, duration)`: Main function to display a toast
- `showSuccessToast(message, duration)`: Helper for success toasts
- `showErrorToast(message, duration)`: Helper for error toasts (longer default duration)
- `showInfoToast(message, duration)`: Helper for info toasts
- `removeToast(id)`: Removes a specific toast by ID

**Usage**:
```typescript
import { showSuccessToast, showErrorToast } from '$lib/stores/toastStore';

// Basic usage
showToast('Action completed');

// With type and duration
showToast('Something went wrong', 'error', 5000);

// Using helper methods
showSuccessToast('Saved successfully!');
showErrorToast('Failed to save');
```

### `src/lib/utils/scoreUtils.ts`

**Purpose**: Handles score calculations and player score management.

**Key Exports**:
- `calculateTotalScore(scores)`: Sums valid scores
- `countHoleInOnes(scores)`: Counts holes-in-one
- `calculatePlayerScore(player)`: Calculates total score and holes-in-one
- `sortPlayersByScore(players)`: Sorts players by score
- `createBlankPlayer(name, holeCount)`: Creates new player object
- `isValidScore(score, min, max)`: Validates score range
- `isGameComplete(players, holeCount)`: Checks if game is complete
- `formatScore(score)`: Formats score for display

### `src/lib/utils/timeFilters.ts`

**Purpose**: Manages time-based filtering of scores and events.

**Key Exports**:
- `getTimeRangeCutoff(timeRange)`: Gets cutoff timestamp for filtering
- `getTimeRangeLabel(timeRange)`: Gets human-readable label for time range

## Core Types and Models

### `src/lib/validations.ts`

**Purpose**: Centralized schema validation using Zod for all data models and forms in the application.

**Key Exports**:

1. **Schema Definitions**:
   - `timeFilterSchema`: Validates time filter values
   - `eventSchema`: Validates Event objects structure
   - `organizationSchema`: Validates Organization objects
   - `scorecardSchema`: Validates Scorecard entries
   - `eventSettingsSchema`: For flexible event settings
   - `organizationSettingsSchema`: For flexible org settings
   - `organizationFormSchema`: Form validation for org setup/editing

2. **Helper Functions**:
   - `validateEvent(data)`: Validates event data
   - `validateOrganization(data)`: Validates organization data
   - `validateScorecard(data)`: Validates scorecard data
   - `validateEventSettings(data)`: Validates event settings
   - `validateOrganizationSettings(data)`: Validates org settings

3. **Type Definitions**:
   - `OrganizationFormData`: Type inferred from organizationFormSchema

**Features**:
- Consistent validation across client and server
- Type-safe schemas that match database models
- User-friendly error messages for form validation
- Support for optional and nullable fields
- String transformations (trim, case normalization)
- URL and format validation for fields like slugs and URLs

### `src/lib/types/models.ts`

**Purpose**: Defines the core data types and interfaces used throughout the application, ensuring type safety and consistency.

**Key Exports**:

1. **Interfaces**:
   - `EventSettings`: Flexible settings for events (stored in JSONB)
   - `OrganizationSettings`: Flexible settings for organizations (stored in JSONB)
   - `PlayerScore`: Represents a player's score in the leaderboard

2. **Types**:
   - `Event`: Complete type definition for event objects
   - `TimeFilter`: Union type for valid time-based filter values
   - `EventLog`: Type for event logging entries
   - `Organization`: Complete type for organization objects
   - `Scorecard`: Type for score entries in the database

3. **Utility Functions**:
   - `normalizeEvent(raw: any): Event`: Normalizes raw event data from the database

## Data Sources

### `src/lib/stores/source/eventSource.ts`

**Purpose**: Manages event data fetching and state management using Svelte stores.

**Key Exports**:
- `eventSource`: A Svelte store with methods to manage event data

**Methods**:
- `fetchEvents(orgId: string)`: Fetches all events for an organization
- `addEvent(newEvent: Omit<Event, 'id'>)`: Adds a new event
- `updateEvent(id: string, updates: Partial<Event>)`: Updates an existing event

**Stores**:
- `loading`: Writable store indicating if an operation is in progress
- `error`: Writable store containing any error messages

### `src/lib/stores/source/orgSource.ts`

**Purpose**: Manages organization data and state.

**Key Exports**:
- `orgSource`: A Svelte store with methods to manage organization data

**Methods**:
- `fetchOrg(orgId: string)`: Fetches an organization by ID
- `updateOrg(orgId: string, updates: Partial<Organization>)`: Updates organization data

**Stores**:
- `loading`: Indicates if an operation is in progress
- `error`: Contains any error messages

### `src/lib/stores/source/scoresSource.ts`

**Purpose**: Manages score data with real-time updates and offline support.

**Key Exports**:
- `scoresSource`: A Svelte store with methods to manage score data

**Methods**:
- `fetchScores(eventId: string)`: Fetches scores for an event
- `addScore(newScore: Omit<Scorecard, 'id'>)`: Adds a new score (with offline support)
- `subscribeToEventScores(eventId: string)`: Sets up real-time subscription
- `flushPending()`: Processes any pending offline writes
- `stop()`: Cleans up subscriptions

**Stores**:
- `loading`: Indicates if an operation is in progress
- `error`: Contains any error messages
- `pendingWrites`: Tracks scores waiting to be synced when online

## Data Flow

1. **Initialization**:
   - Components subscribe to the appropriate source store
   - Data is fetched on component mount or when parameters change
   - Utility functions handle data transformation and validation

2. **Real-time Updates**:
   - Scores and events update in real-time using Supabase subscriptions
   - UI automatically reacts to data changes
   - Time-based utilities ensure consistent filtering and display

3. **Offline Support**:
   - Scores are queued when offline
   - Automatic sync when connection is restored
   - Code utilities ensure unique IDs are generated properly

## Type Safety

- All data is validated against Zod schemas
- TypeScript ensures type safety throughout the application
- Database rows are normalized and validated before being used
- Utility functions include comprehensive type definitions

## Error Handling

- Each source maintains its own error state
- Errors are automatically cleared on the next operation
- Components can subscribe to error stores to display appropriate messages
- Utility functions include input validation

## Code Generation & Validation

- Centralized code/UUID generation ensures uniqueness
- Validation functions maintain data integrity
- Time and date handling is consistent across the application
