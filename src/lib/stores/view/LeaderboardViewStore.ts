import { derived, get, writable, type Readable } from 'svelte/store';
import type { Event, Scorecard } from '$lib/validations';
import { timeFilterSchema, type TimeFilter } from '$lib/validations/timeFilter';
import { getTimeRangeLabel, getTimeRangeCutoff } from '$lib/utils/timeFiltersUtils';
import type { PlayerHoleScore, PlayerTotalScore } from '$lib/validations/playerScore';
import { getPlayerTotalScore, getPlayerHoleInOnes, getLastUpdated } from '$lib/utils/scoreUtils';
import { playerScoreSchema } from '$lib/validations/playerScore';
import { scoresSource } from '$lib/stores/source/scoresSource';
import { eventSource } from '$lib/stores/source/eventSource';
import { validate } from '$lib/validations/validationUtils';

// --- Constants ---

const DEFAULT_SCORE_LIMIT = 100;

// --- Types ---

type LeaderboardView = {
  eventShortCode: string;
  timeFilter: TimeFilter;
  label: string;
  isActive: boolean;
  scores: PlayerTotalScore[];
  loading: boolean;
  error: string | null;
  lastUpdated?: string;
};

type LeaderboardState = {
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  activeViewIndex: number;
  views: LeaderboardView[];
};

type TimeFilterOption = {
  value: TimeFilter;
  label: string;
};

// --- Helper Functions ---

function createInitialState(): LeaderboardState {
  return {
    loading: false,
    error: null,
    lastUpdated: null,
    activeViewIndex: 0,
    views: []
  };
}

function createLeaderboardView(
  event: Event,
  timeFilter: TimeFilter,
  label: string
): LeaderboardView {
  return {
    eventShortCode: event.short_code,
    timeFilter,
    label,
    isActive: false,
    scores: [],
    loading: false,
    error: null
  };
}

// --- Data Helpers ---

async function getLiveEvents(): Promise<Event[]> {
  return new Promise((resolve) => {
    const unsubscribe = eventSource.subscribe(($events) => {
      const liveEvents = $events.filter((event: Event) => event.published === true);
      unsubscribe();
      resolve(liveEvents);
    });
  });
}

async function getFilteredScores({
  eventShortCode,
  timeFilter,
  limit = 10
}: {
  eventShortCode: string;
  timeFilter: TimeFilter;
  limit?: number;
}): Promise<PlayerTotalScore[]> {
  const cutoff = getTimeRangeCutoff(timeFilter);
  
  // First, get all hole scores for the event
  const holeScores = await new Promise<Scorecard[]>((resolve) => {
    const unsubscribe = scoresSource.subscribe(($scores) => {
      const filteredScores = $scores.filter((score) => {
        if (score.event_id !== eventShortCode) return false;
        if (cutoff && score.created_at) {
          return new Date(score.created_at) >= new Date(cutoff);
        }
        return true;
      });
      resolve(filteredScores);
      unsubscribe();
    });
  });

  if (!holeScores) {
    console.error('No scores found');
    return [];
  }

  // Group hole scores by player
  const scoresByPlayer = holeScores.reduce<Record<string, PlayerHoleScore[]>>((acc: Record<string, PlayerHoleScore[]>, score) => {
    const playerId = score.player_id || 'unknown';
    if (!acc[playerId]) {
      acc[playerId] = [];
    }
    
    const holeScore: Omit<PlayerHoleScore, 'id'> = {
      player_id: playerId,
      name: score.name || 'Unknown Player',
      score: score.score || 0,
      hole_number: score.hole_number || undefined,
      created_at: score.created_at || undefined,
      updated_at: score.updated_at || undefined,
    };
    
    acc[playerId].push(holeScore as PlayerHoleScore);
    return acc;
  }, {});

  // Convert to PlayerTotalScore array
  return Object.entries(scoresByPlayer)
    .map(([playerId, playerHoleScores]) => {
      const totalScore = getPlayerTotalScore(playerHoleScores);
      const holeInOnes = getPlayerHoleInOnes(playerHoleScores);
      const lastUpdated = getLastUpdated(playerHoleScores) || new Date().toISOString();
      
      return {
        player_id: playerId,
        name: playerHoleScores[0]?.name || 'Unknown Player',
        totalScore,
        holeInOnes,
        lastUpdated,
        // For backward compatibility
        id: playerId,
        scores: playerHoleScores.map(s => s.score)
      } as PlayerTotalScore;
    })
    .slice(0, limit);
}

function createLeaderboardViewStore() {
  const { subscribe, set, update } = writable<LeaderboardState>(createInitialState());
  let unsubscribeScores: (() => void) | null = null;
  
  // Cleanup subscriptions on destroy
  function cleanup() {
    if (unsubscribeScores) {
      unsubscribeScores();
      unsubscribeScores = null;
    }
  }

  // Initialize the store
  initialize();

  /**
   * Initialize leaderboard views based on live events
   */
  async function initialize() {
    update(state => ({ ...state, loading: true, error: null }));

    try {
      const events = await getLiveEvents();
      const views: LeaderboardView[] = [];
      
      // Create views for each event and time filter combination
      events.forEach((event) => {
        const eventTimeFilters = event.time_filters || [];
        
        getAvailableTimeFilters().forEach(({ value: timeFilter, label }: { value: TimeFilter; label: string }) => {
          if (eventTimeFilters.length === 0 || eventTimeFilters.includes(timeFilter as TimeFilter)) {
            views.push(createLeaderboardView(
              event,
              timeFilter,
              `${event.title} - ${label}`
            ));
          }
        });
      });

      // Set the first view as active if available
      if (views.length > 0) {
        views[0].isActive = true;
      }

      update(state => ({
        ...state,
        views,
        loading: false,
        lastUpdated: new Date()
      }));

      // Load scores for the active view
      if (views.length > 0) {
        await loadScores(0);
      }
    } catch (error) {
      console.error('Failed to initialize leaderboard:', error);
      update(state => ({
        ...state,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load leaderboard'
      }));
    }
  }

  /**
   * Load scores for a specific view
   */
  async function loadScores(viewIndex: number) {
    update(state => {
      if (viewIndex < 0 || viewIndex >= state.views.length) return state;
      
      const updatedViews = [...state.views];
      updatedViews[viewIndex] = { ...updatedViews[viewIndex], loading: true };
      
      return {
        ...state,
        views: updatedViews,
        loading: true,
        error: null
      };
    });

    try {
      const state = get({ subscribe });
      const activeView = state.views[viewIndex];
      if (!activeView) return state;

      // Get filtered scores
      const scores = await getFilteredScores({
        eventShortCode: activeView.eventShortCode,
        timeFilter: activeView.timeFilter,
        limit: DEFAULT_SCORE_LIMIT
      });

      // Update the view with the loaded scores
      update(currentState => {
        const updatedViews = [...currentState.views];
        updatedViews[viewIndex] = {
          ...activeView,
          scores,
          loading: false
        };

        return {
          ...currentState,
          views: updatedViews,
          loading: false,
          lastUpdated: new Date()
        };
      });
    } catch (error) {
      console.error('Failed to load scores:', error);
      update(currentState => ({
        ...currentState,
        error: error instanceof Error ? error.message : 'Failed to load scores',
        loading: false
      }));
    }
  }

  /**
   * Set the active view
   */
  function setActiveView(index: number) {
    update(state => {
      if (index < 0 || index >= state.views.length) return state;
      
      const updatedViews = state.views.map((view, i) => ({
        ...view,
        isActive: i === index
      }));

      // Load scores for the new active view if not already loaded
      if (updatedViews[index].scores.length === 0) {
        loadScores(index);
      }

      return {
        ...state,
        views: updatedViews,
        activeViewIndex: index
      };
    });
  }

  /**
   * Refresh the current view
   */
  function refresh() {
    update(state => {
      if (state.views.length === 0) return state;
      loadScores(state.activeViewIndex);
      return state;
    });
  }

  // Initialize the store
  initialize();

  // Return public API
  return {
    subscribe,
    actions: {
      setActiveView,
      refresh,
      initialize
    }
  };
}

// Export the store instance
export const leaderboardViewStore = createLeaderboardViewStore();

// Export types
export type { LeaderboardView, LeaderboardState };
export type LeaderboardType = 'single' | 'multi';

// Export utility functions
export const getAvailableTimeFilters = (): TimeFilterOption[] => {
  return timeFilterSchema.options.map((value: TimeFilter) => ({
    value,
    label: getTimeRangeLabel(value)
  }));
};

// Export the store creation function for testing
export { createLeaderboardViewStore };
