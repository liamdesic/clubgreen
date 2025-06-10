# Leaderboard Update Edge Function

This Edge Function updates and manages the leaderboard by aggregating scores from the `scorecard` table. It supports filtering by time period and handles player score calculations including hole-in-ones.

## Features

- Aggregates player scores across all holes
- Supports time-based filtering (today/all time)
- Tracks hole-in-ones
- Secure API key authentication
- Real-time leaderboard updates

## Authentication

All requests must include a valid API key in one of the following ways:
- `Authorization: Bearer YOUR_API_KEY` header
- `x-api-key: YOUR_API_KEY` header

## API Endpoints

### Update Leaderboard

```
POST /update-leaderboard
```

#### Request Body

```typescript
{
  "event_id": string,          // Required: UUID of the event
  "time_filter?": "today" | "all_time",  // Optional: Filter scores by time period
  "force_update?": boolean      // Optional: Force update even if no new scores
}
```

#### Success Response (200 OK)

```typescript
{
  "success": true,
  "updated_at": string,         // ISO timestamp of the update
  "count": number,             // Number of players in the leaderboard
  "message": string            // Status message
}
```

#### Error Responses

- `400 Bad Request` - Invalid request body or missing parameters
- `401 Unauthorized` - Missing or invalid API key
- `500 Internal Server Error` - Server error during processing

## Score Calculation

- **Total Score**: Sum of all hole scores (lower is better)
- **Hole-in-Ones**: Count of holes completed in 1 stroke
- **Tiebreakers**: When scores are tied, the following are considered in order:
  1. Number of hole-in-ones
  2. Most recent score update time

## Environment Variables

Required:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key with write access to leaderboard tables
- `LEADERBOARD_API_KEYS`: Comma-separated list of valid API keys

Optional:
- `LEADERBOARD_API_KEY`: Single API key (legacy, for backward compatibility)

## Rate Limiting

- Maximum of 10 requests per minute per API key
- Responses include rate limit headers:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when limit resets (UTC timestamp)

## Database Schema

The function interacts with the following tables:
- `scorecard`: Source of individual hole scores
- `leaderboard_snapshot`: Stores aggregated leaderboard data

## Development

To test locally:

1. Set up environment variables:
   ```bash
   cp .env.example .env
   # Update with your Supabase credentials
   ```

2. Run the function:
   ```bash
   supabase functions serve update-leaderboard --env-file .env
   ```

3. Test with curl:
   ```bash
   curl -X POST http://localhost:54321/functions/v1/update-leaderboard \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"event_id": "YOUR_EVENT_ID"}'
   ```

The function interacts with the following tables:

### leaderboard_snapshot

```sql
CREATE TABLE public.leaderboard_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  time_filter TEXT NOT NULL DEFAULT 'all_time',
  scores JSONB NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT leaderboard_snapshot_event_time_unique UNIQUE (event_id, time_filter)
);
```

## Deployment

1. Install the Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. Login to your Supabase account:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Deploy the function:
   ```bash
   supabase functions deploy update-leaderboard --project-ref your-project-ref
   ```

## Triggering the Function

You can trigger this function in several ways:

1. **After a score is submitted** (recommended):
   - Call the function after inserting new scores

2. **Scheduled (CRON)**:
   ```bash
   # Run every 5 minutes
   supabase functions schedule create update-leaderboard --cron "*/5 * * * *" --payload '{"event_id":"your-event-id"}'
   ```

3. **Database Trigger**:
   Create a PostgreSQL trigger that calls the function when the `scorecard` table is updated.

## Error Handling

The function returns appropriate HTTP status codes and error messages in the response body if something goes wrong.
