# ClubGreen Core Exports Reference

## Database Schema (database.types.ts)

### Core Types
- `Database`: Root type containing all database table definitions
  - `public.Tables`: Database tables
    - `event_logs`: Event logging table
    - `events`: Events table
    - `organizations`: Organizations table
    - `scorecard`: Scorecard table

### Table Types
Each table has three main type variants:
- `Row`: Type for complete table rows
- `Insert`: Type for creating new rows
- `Update`: Type for updating existing rows

---

## Core Exports Reference

## Core Validations (validations.ts)

### Schemas
- `eventSettingsSchema`: Flexible/experimental event settings
- `organizationSettingsSchema`: Flexible/experimental org settings
- `eventSchema`: Core event data structure
- `organizationSchema`: Core organization data structure
- `scorecardSchema`: Scorecard data structure with validation
- `eventLogSchema`: Event logging structure

### Types
- `Event`: Type for event data
- `Organization`: Type for organization data
- `Scorecard`: Type for scorecard data
- `EventLog`: Type for event log entries
- `ScorecardInsert`: Type for creating new scorecards
- `ScorecardUpdate`: Type for updating existing scorecards

### Helper Functions
- `normalizeEvent(raw: any): Event`: Converts raw event data to normalized form
- `fromScorecardRow(row: unknown): Scorecard | null`: Converts DB row to Scorecard

### Types
- `Event`: Type for event data
- `Organization`: Type for organization data
- `Scorecard`: Type for scorecard data
- `EventLog`: Type for event log entries
- `ScorecardInsert`: Type for creating new scorecards
- `ScorecardUpdate`: Type for updating existing scorecards
- `EventTimeFilters`: Type for event time filters

### Helper Functions
- `normalizeEvent(raw: any): Event`: Converts raw event data to normalized form
- `fromScorecardRow(row: unknown): Scorecard | null`: Converts DB row to Scorecard

## Validation Modules (validations/)

### dateSchemas.ts
- `dateSchema`: Validates and normalizes date strings (accepts both Date objects and ISO strings)
  ```typescript
  z.union([
    z.string().datetime(),
    z.date().transform(d => d.toISOString())
  ])
  ```
- `nullableDateSchema`: Nullable version of dateSchema that transforms null/undefined to null

### errorSchemas.ts
- `FormErrorResponse<T>`: Generic type for form validation errors
  ```typescript
  {
    values: Partial<T>;
    errors: { [key: string]: string[] | undefined };
    message?: string;
  }
  ```
- `createErrorResponse<T>(error: FormErrorResponse<T>)`: Creates a type-safe error response
- `isFormErrorResponse(value: unknown)`: Type guard for FormErrorResponse
- `fieldError(field: string, message: string)`: Helper for field-specific errors

### organizationForm.ts
- `organizationFormSchema`: Schema for organization form validation
  ```typescript
  z.object({
    name: z.string().min(2).max(50).trim(),
    slug: z.string()
      .min(2).max(30)
      .regex(/^[a-z0-9-]+$/)
      .transform(val => val.toLowerCase().trim()),
    logoUrl: z.string().url().optional().or(z.literal(''))
  })
  ```
- `OrganizationFormData`: Type for organization form data (inferred from organizationFormSchema)

### playerScore.ts
- `PlayerScoreInput`: Interface for creating/updating player scores
  ```typescript
  interface PlayerScoreInput {
    id: string;
    player_id?: string;  // Optional for input, will be set if not provided
    name: string;
    scores: (number | null)[];
  }
  ```
- `playerScoreSchema`: Zod schema for validating player scores with fields:
  - `id`: UUID string
  - `player_id`: UUID string
  - `name`: Non-empty string
  - `scores`: Array of numbers (1-20) or nulls
  - `totalScore`: Computed total score (non-negative integer)
  - `holeInOnes`: Count of hole-in-ones (non-negative integer)
  - `recorded_at`: Optional ISO datetime string
- `PlayerScore`: Type for player score data (inferred from playerScoreSchema)
- `validatePlayerScore(data: unknown): PlayerScore | null`: Validates and parses player score data
- `createPlayerScore(input: PlayerScoreInput): PlayerScore`: Creates a new PlayerScore with calculated totals
- `createBlankPlayerScore(name: string, holeCount: number): PlayerScore`: Creates a blank score with null values
- `sortPlayersByScore(players: PlayerScore[]): PlayerScore[]`: Sorts players by total score (ascending)

### timeFilter.ts
- `timeFilterSchema`: Enum schema for time-based filters
  ```typescript
  z.enum([
    'all_time',
    'last_hour',
    'last_day',
    'last_week',
    'last_month',
    'since_start_of_hour',
    'since_start_of_day',
    'since_start_of_month',
  ])
  ```
- `TimeFilter`: Type for time filter values
- `eventTimeFiltersSchema`: Schema for an array of time filters (defaults to `['all_time']`)
- `EventTimeFilters`: Type for an array of time filters
- `validateTimeFilter(value: unknown): TimeFilter | null`: Validates a time filter value

### validationUtils.ts
- `validate<T>(schema: T, data: unknown)`: Generic validation function that validates data against a Zod schema
  ```typescript
  function validate<T extends z.ZodTypeAny>(
    schema: T,
    data: unknown
  ): z.SafeParseReturnType<z.infer<T>, z.infer<T>>
  ```
- Convenience validators:
  - `validateEvent(data: unknown)`: Validates event data
  - `validateOrganization(data: unknown)`: Validates organization data
  - `validateScorecard(data: unknown)`: Validates scorecard data
  - `validateEventSettings(data: unknown)`: Validates event settings
  - `validateOrganizationSettings(data: unknown)`: Validates organization settings

## Source Stores (stores/source/)

### eventSource.ts
- `eventSource`: Store for managing event data
  - `fetchEvents(orgId: string)`: Fetches events for an organization
  - `addEvent(newEvent: Omit<Event, 'id'>)`: Adds a new event
  - `updateEvent(updatedEvent: Event)`: Updates an existing event
  - `deleteEvent(eventId: string)`: Deletes an event

### orgSource.ts
- `orgSource`: Store for managing organization data
  - `fetchOrganizations()`: Fetches all organizations
  - `addOrganization(org: Omit<Organization, 'id'>)`: Adds a new organization
  - `updateOrganization(org: Organization)`: Updates an organization

### scoresSource.ts
- `scoresSource`: Store for managing score data
  - `fetchScores(eventId: string)`: Fetches scores for an event
  - `addScore(score: ScorecardInsert)`: Adds a new score
  - `updateScore(score: Scorecard)`: Updates an existing score
  - `deleteScore(scoreId: string)`: Deletes a score
