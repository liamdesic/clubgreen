// @deno-types="https://deno.land/x/types/deno.d.ts"
// @ts-ignore - Deno types are available at runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '../_shared/supabaseClient.ts';
import type { Database } from '../_shared/types.gen.ts';

// Add global type for Deno
// @ts-ignore - Deno is available at runtime
declare const Deno: any;

// Define the types we need directly in the Edge Function
interface PlayerHoleScore {
  player_id: string;
  name: string;
  score: number | null;
  hole_number?: number;
  played_at?: string | null;
}

interface PlayerTotalScore {
  player_id: string;
  name: string;
  totalScore: number;
  holeInOnes: number;
  lastUpdated: string;
  scores: (number | null)[];
}

// Score calculation functions moved from client-side code
function createPlayerTotalScore(holeScores: PlayerHoleScore[]): PlayerTotalScore | null {
  if (!holeScores.length) return null;
  
  // Sort by hole number to ensure consistent order
  const sortedScores = [...holeScores].sort((a, b) => 
    (a.hole_number || 0) - (b.hole_number || 0)
  );
  
  let totalScore = 0;
  let holeInOnes = 0;
  const scores: (number | null)[] = [];
  
  for (const score of sortedScores) {
    if (score.score !== null) {
      totalScore += score.score;
      if (score.score === 1) holeInOnes++;
      scores.push(score.score);
    } else {
      scores.push(null);
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
  timeFilter: 'today' | 'all_time' = 'all_time',
  filterFn: (score: PlayerHoleScore) => boolean = () => true
): PlayerTotalScore[] {
  // Get the current date in ISO format (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];
  
  // Create a filter function based on the time filter
  const timeFilterFn = (score: PlayerHoleScore) => {
    if (timeFilter === 'today') {
      return score.played_at?.startsWith?.(today) ?? false;
    }
    return true;
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
    const playerTotal = createPlayerTotalScore(playerScores);
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
  time_filter?: 'today' | 'all_time';
}

// Helper function to validate API key
function isValidApiKey(req: Request): boolean {
  // Get API key from headers (try both x-api-key and authorization)
  const apiKey = req.headers.get('x-api-key') || 
                (() => {
                  const authHeader = req.headers.get('authorization');
                  return authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
                })();
  
  if (!apiKey) {
    console.error('No API key provided in x-api-key header or Authorization: Bearer token');
    return false;
  }

  // Check if the provided API key matches any of the allowed keys
  const isValid = API_KEYS.some(key => key === apiKey);
  if (!isValid) {
    console.error('Invalid API key provided');
  }
  return isValid;
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
    
    // Verify API key
    if (!isValidApiKey(req)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    
    // Build the query based on time filter
    let query = supabase
      .from('scorecard' as any) // Type assertion to avoid TypeScript errors
      .select('*')
      .eq('event_id', event_id);

    // Apply time filter if needed
    if (time_filter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = (query as any).gte('created_at', today.toISOString());
    }

    // Execute the query
    const { data: scores, error } = await query;
    
    if (error) {
      console.error('Error fetching scores:', error);
      throw error;
    }

    if (!scores || !Array.isArray(scores)) {
      throw new Error('Invalid scores data received from database');
    }

    // Type assertion for the scores
    const typedScores: PlayerHoleScore[] = scores.map(score => ({
      player_id: score.player_id,
      name: score.name,
      score: score.score,
      hole_number: score.hole_number,
      played_at: score.played_at || undefined
    }));

    // Calculate leaderboard
    const playerScores = aggregatePlayerScores(typedScores, time_filter);
    const sortedScores = sortPlayerScores(playerScores);
    const topScores = sortedScores.slice(0, 10);

    // Update or insert the leaderboard snapshot
    const { data: upsertData, error: upsertError } = await (supabase
      .from('leaderboard_snapshot' as any) // Type assertion to avoid TypeScript errors
      .upsert(
        {
          event_id,
          time_filter: time_filter,
          scores: topScores,
          last_updated: new Date().toISOString()
        } as any,
        {
          onConflict: 'event_id,time_filter',
          returning: 'representation'
        } as any
      )
      .select() as any);

    if (upsertError) {
      console.error('Error updating leaderboard snapshot:', upsertError);
      throw upsertError;
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
