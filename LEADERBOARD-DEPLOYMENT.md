# Leaderboard Snapshot System - Deployment Guide

## Prerequisites

1. Supabase project with the following:
   - Supabase CLI installed (`npm install -g supabase`)
   - Project linked (`supabase link --project-ref your-project-ref`)
   - Service role key with permissions to update `leaderboard_snapshot` table

## Environment Variables

### Client-Side (Add to your `.env` file)
```
PUBLIC_LEADERBOARD_API_KEY=your_secure_api_key_here
```

### Server-Side (Set in Supabase Dashboard)
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Under "Project API keys", copy the `anon` public key
4. Navigate to Settings → Database → Functions
5. Add the following environment variables:
   ```
   LEADERBOARD_API_KEYS=your_secure_api_key_here
   ```

## Database Setup

1. Apply the database migration to create the `leaderboard_snapshot` table:
   ```bash
   supabase db push
   ```

## Deploy the Edge Function

1. Build and deploy the Edge Function:
   ```bash
   supabase functions deploy update-leaderboard --project-ref your-project-ref
   ```

2. Set the function URL as an environment variable for easier access:
   ```bash
   export LEADERBOARD_FUNCTION_URL=$(supabase functions url update-leaderboard)
   ```

## Testing the Implementation

1. Test the Edge Function directly:
   ```bash
   curl -X POST $LEADERBOARD_FUNCTION_URL \
     -H "Authorization: Bearer your_secure_api_key_here" \
     -H "Content-Type: application/json" \
     -d '{"event_id": "your-event-id"}'
   ```

2. Verify the leaderboard snapshot was created:
   ```sql
   SELECT * FROM leaderboard_snapshot WHERE event_id = 'your-event-id';
   ```

## Client Integration

1. The client will automatically trigger leaderboard updates when scores are submitted
2. To manually trigger an update:
   ```typescript
   import { triggerLeaderboardUpdate } from '$lib/utils/leaderboardUtils';
   
   // Example usage
   const result = await triggerLeaderboardUpdate(eventId, 'all_time');
   if (result.success) {
     console.log('Leaderboard update triggered');
   } else {
     console.error('Failed to update leaderboard:', result.error);
   }
   ```

## Monitoring

1. Check function logs in the Supabase dashboard under Logs → Edge Functions
2. Monitor the `leaderboard_snapshot` table for updates
3. Set up alerts for any errors in the Edge Function

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Ensure the service role key has proper permissions
   - Verify RLS policies on the `leaderboard_snapshot` table

2. **Function Not Found**
   - Verify the function name matches exactly
   - Check that the function was deployed successfully

3. **Invalid API Key**
   - Verify the API key in your environment variables matches the one in Supabase
   - Check for any typos or extra spaces

## Rollback Plan

1. To disable the new leaderboard system:
   - Remove the Edge Function trigger from the score submission flow
   - Fall back to client-side leaderboard calculation
   - The system will continue to work with the existing scorecard table

## Performance Considerations

1. The Edge Function is designed to handle high traffic, but monitor:
   - Execution time (should be under 1 second)
   - Memory usage
   - Concurrent executions

2. For very large events, consider:
   - Increasing the function timeout
   - Implementing pagination in the score fetching
   - Adding caching for frequently accessed leaderboards
