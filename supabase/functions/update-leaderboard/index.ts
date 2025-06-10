// @deno-types="https://deno.land/x/types/deno.d.ts"
// @ts-ignore - Deno types are available at runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '../_shared/supabaseClient.ts';
import type { Database } from '../_shared/types.gen.ts';

// Add global type for Deno
// @ts-ignore - Deno is available at runtime
declare const Deno: any;

// Define the types we need directly in the Edge Function
type TimeFilter = 'all_time' | 'past_hour' | 'past_day' | 'past_week' | 'past_month' | 'on_the_hour' | 'since_start_of_hour' | 'since_start_of_day' | 'since_start_of_month';

interface PlayerHoleScore {
  player_id: string;
  name: string;
  score: number | null;
  hole_number?: number;
  created_at?: string | null;
}

interface PlayerTotalScore {
  player_id: string;
  name: string;
  totalScore: number;
  holeInOnes: number;
  lastUpdated?: string;
  scores: (number | null)[];
}

// Score calculation functions moved from client-side code
function createPlayerTotalScore(holeScores: PlayerHoleScore[], numberOfHoles: number): PlayerTotalScore | null {
  if (!holeScores.length) return null;
  
  // Sort by hole number to ensure consistent order
  const sortedScores = [...holeScores].sort((a, b) => 
    (a.hole_number || 0) - (b.hole_number || 0)
  );
  
  let totalScore = 0;
  let holeInOnes = 0;
  const scores: (number | null)[] = Array(numberOfHoles).fill(null);
  
  for (const score of sortedScores) {
    if (score.hole_number && score.hole_number <= numberOfHoles) {
      const index = score.hole_number - 1;
      if (score.score !== null) {
        totalScore += score.score;
        if (score.score === 1) holeInOnes++;
        scores[index] = score.score;
      }
    }
  }
  
  return {
    player_id: holeScores[0].player_id,
    name: holeScores[0].name,
    totalScore,
    holeInOnes,
    lastUpdated: new Date().toISOString(),
    scores
  };
}

function aggregatePlayerScores(
  holeScores: PlayerHoleScore[],
  timeFilter: TimeFilter = 'all_time',
  filterFn: (score: PlayerHoleScore) => boolean = () => true,
  numberOfHoles: number = 18
): PlayerTotalScore[] {
  // Get the current date in ISO format (YYYY-MM-DD)
  const now = new Date();
  
  // Create a filter function based on the time filter
  const timeFilterFn = (score: PlayerHoleScore) => {
    if (!score.created_at) return false;
    const createdAt = new Date(score.created_at);
    
    switch (timeFilter) {
      case 'all_time':
        return true;
      case 'past_hour':
        return createdAt >= new Date(now.getTime() - 60 * 60 * 1000);
      case 'past_day':
        return createdAt >= new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'past_week':
        return createdAt >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'past_month':
        return createdAt >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'on_the_hour':
        return createdAt.getMinutes() === 0;
      case 'since_start_of_hour':
        const startOfHour = new Date(now);
        startOfHour.setMinutes(0, 0, 0);
        return createdAt >= startOfHour;
      case 'since_start_of_day':
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        return createdAt >= startOfDay;
      case 'since_start_of_month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return createdAt >= startOfMonth;
      default:
        return true;
    }
  };

  // Group by player_id, applying the filter
  const scoresByPlayer = holeScores.reduce<Record<string, PlayerHoleScore[]>>((acc, score) => {
    if (filterFn(score) && timeFilterFn(score)) {
      if (!acc[score.player_id]) {
        acc[score.player_id] = [];
      }
      acc[score.player_id].push(score);
    }
    return acc;
  }, {});

  // Calculate totals for each player
  const result: PlayerTotalScore[] = [];
  
  for (const playerScores of Object.values(scoresByPlayer)) {
    const playerTotal = createPlayerTotalScore(playerScores, numberOfHoles);
    if (playerTotal) {
      result.push(playerTotal);
    }
  }
  
  return result;
}

function sortPlayerScores(scores: PlayerTotalScore[]): PlayerTotalScore[] {
  return [...scores].sort((a, b) => {
    // First by total score (ascending)
    if (a.totalScore !== b.totalScore) {
      return a.totalScore - b.totalScore;
    }
    // Then by hole-in-ones (descending)
    if (b.holeInOnes !== a.holeInOnes) {
      return b.holeInOnes - a.holeInOnes;
    }
    // Finally by name (ascending)
    return a.name.localeCompare(b.name);
  });
}

// Environment variables
const API_KEYS = (Deno.env.get?.('LEADERBOARD_API_KEYS') || '').split(',').map((k: string) => k.trim());
const REQUIRED_API_KEY = Deno.env.get?.('LEADERBOARD_API_KEY') || ''; // For backward compatibility

// Add any existing API key to the allowed keys
if (REQUIRED_API_KEY && !API_KEYS.includes(REQUIRED_API_KEY)) {
  API_KEYS.push(REQUIRED_API_KEY);
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface UpdateLeaderboardRequest {
  event_id: string;
  time_filter?: TimeFilter;
}

// TEMPORARILY DISABLED FOR TESTING - RE-ENABLE BEFORE DEPLOYMENT
function isValidApiKey(_req: Request): boolean {
  console.log('Skipping API key validation for testing');
  return true;
}

// Main handler for the Edge Function
serve(async (req) => {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    // Verify the request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // TEMPORARILY DISABLED FOR TESTING - RE-ENABLE BEFORE DEPLOYMENT
    // Verify API key
    // if (!isValidApiKey(req)) {
    //   return new Response(
    //     JSON.stringify({ error: 'Unauthorized' }),
    //     { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    //   );
    // }

    // Parse the request body
    const requestData: UpdateLeaderboardRequest = await req.json();
    
    // Validate required fields
    if (!requestData.event_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: event_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { event_id, time_filter = 'all_time' } = requestData;
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }
    
    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // First get the event to determine number of holes
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('hole_count')
      .eq('id', event_id)
      .single();

    if (eventError) {
      console.error('Error fetching event:', eventError);
      throw eventError;
    }

    const numberOfHoles = event?.hole_count || 18; // Default to 18 if not specified
    
    // Build the query based on time filter
    let query = supabase
      .from('scorecard' as any) // Type assertion to avoid TypeScript errors
      .select('player_id, name, score, hole_number, created_at')
      .eq('event_id', event_id);

    console.log('Query parameters:', {
      event_id,
      time_filter,
      numberOfHoles,
      cutoffDate: time_filter !== 'all_time' ? getTimeRangeCutoff(time_filter) : null
    });

    // Apply time filter if needed
    if (time_filter !== 'all_time') {
      const cutoffDate = getTimeRangeCutoff(time_filter);
      if (cutoffDate) {
        query = (query as any).gte('created_at', cutoffDate);
      }
    }

    // Execute the query
    const { data: scores, error } = await query;
    
    if (error) {
      console.error('Error fetching scores:', error);
      throw error;
    }

    console.log('Raw scores from database:', scores);

    if (!scores || !Array.isArray(scores)) {
      throw new Error('Invalid scores data received from database');
    }

    // Type assertion for the scores
    const typedScores: PlayerHoleScore[] = scores.map(score => ({
      player_id: score.player_id,
      name: score.name,
      score: score.score,
      hole_number: score.hole_number,
      created_at: score.created_at || undefined
    }));

    console.log('Typed scores after mapping:', typedScores);

    // Calculate leaderboard
    const playerScores = aggregatePlayerScores(typedScores, time_filter, () => true, numberOfHoles);
    console.log('Player scores after aggregation:', playerScores);
    
    const sortedScores = sortPlayerScores(playerScores);
    console.log('Sorted scores:', sortedScores);
    
    const topScores = sortedScores.slice(0, 10);
    console.log('Top scores:', topScores);

    // Update or insert the leaderboard snapshot
    const { error: insertError } = await supabase
      .from('leaderboard_snapshot')
      .insert({
        event_id: event_id,
        time_filter: time_filter,
        scores: topScores,
      });

    if (insertError) {
      console.error('Error updating leaderboard snapshot:', insertError);
      throw insertError;
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        updated_at: new Date().toISOString(),
        count: topScores.length
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in update-leaderboard function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

// Helper function to get cutoff date for time filters
function getTimeRangeCutoff(timeFilter: TimeFilter): string | null {
  const now = new Date();
  
  switch (timeFilter) {
    case 'all_time':
      return null;
    case 'past_hour':
      return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    case 'past_day':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case 'past_week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case 'past_month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case 'since_start_of_hour':
      const startOfHour = new Date(now);
      startOfHour.setMinutes(0, 0, 0);
      return startOfHour.toISOString();
    case 'since_start_of_day':
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      return startOfDay.toISOString();
    case 'since_start_of_month':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return startOfMonth.toISOString();
    case 'on_the_hour':
      // For on_the_hour, we'll filter in the aggregatePlayerScores function
      return null;
    default:
      return null;
  }
}
