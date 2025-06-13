import { writable, derived, get } from 'svelte/store';
import type { LeaderboardBoard, LeaderboardBoardView, LeaderboardRotationState, LeaderboardScore } from '$lib/validations/leaderboardView';
import type { BoardRuntimeConfig, BoardState, BoardRuntimeStatus, BoardRuntime } from './board.types';
import { subscribeToLeaderboard } from './scoreSnapshot';
import { validateLeaderboardScores } from '$lib/validations/leaderboardView';
import { supabase } from '$lib/supabaseClient';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { showToast } from '$lib/stores/toastStore';
import type { TimeFilter } from '$lib/validations/timeFilter';

/**
 * Internal state for the runtime
 */
interface BoardRuntimeState {
  /** All boards in the runtime */
  boards: Record<string, BoardState>;
  
  /** ID of the currently active board */
  activeBoardId: string | null;
  
  /** Timer for rotation */
  rotationTimer: NodeJS.Timeout | null;
  
  /** When the next rotation will occur */
  nextRotationAt: number | null;
  
  /** Runtime configuration */
  config: BoardRuntimeConfig;
}

// Initial state
const initialState: BoardRuntimeState = {
  boards: {},
  activeBoardId: null,
  rotationTimer: null,
  nextRotationAt: null,
  config: {
    rotationEnabled: false,
    rotationIntervalMs: 30000, // Default 30 seconds
    onError: undefined
  }
};

// Create the runtime store
const runtimeStore = writable<BoardRuntimeState>(initialState);

// Create derived store for runtime status
const runtimeStatus = derived(runtimeStore, ($state): BoardRuntimeStatus => {
  const now = Date.now();
  const timeUntilRotation = $state.nextRotationAt ? $state.nextRotationAt - now : null;
  
  return {
    isRotating: $state.config.rotationEnabled,
    rotationIntervalMs: $state.config.rotationIntervalMs,
    boardCount: Object.keys($state.boards).length,
    activeBoardId: $state.activeBoardId,
    nextRotationAt: $state.nextRotationAt,
    timeUntilRotation,
    lastUpdated: new Date().toISOString()
  };
});

// Create the current board store
const currentBoard = derived(runtimeStore, ($state) => {
  if (!$state.activeBoardId) return null;
  return $state.boards[$state.activeBoardId]?.board || null;
});

// Create the current scores store
const currentScores = derived(runtimeStore, ($state) => {
  if (!$state.activeBoardId) return null;
  return $state.boards[$state.activeBoardId]?.scores || null;
});

// Create the board runtime
const boardRuntime: BoardRuntime = {
  subscribe: runtimeStore.subscribe,
  
  initialize: (config) => {
    // Update config if provided
    if (config) {
      runtimeStore.update(state => ({
        ...state,
        config: {
          ...state.config,
          ...config
        }
      }));
    }
    
    // Return cleanup function
    return () => {
      runtimeStore.update(state => {
        // Clear rotation timer
        if (state.rotationTimer) {
          clearTimeout(state.rotationTimer);
        }
        
        // Unsubscribe from all boards
        Object.values(state.boards).forEach(board => {
          if (board.unsubscribe) {
            board.unsubscribe();
          }
        });
        
        return initialState;
      });
    };
  },
  
  async setBoards(boards: LeaderboardBoard[]) {
    try {
      const newBoards: Record<string, BoardState> = {};
      for (const board of boards) {
        const scores = await supabase
          .from('leaderboard_snapshot')
          .select('scores')
          .eq('event_id', board.eventId)
          .eq('time_filter', board.timeFilter)
          .single();

        if (scores.error) {
          newBoards[board.id] = {
            board,
            scores: null,
            error: scores.error.message,
            loading: false,
            lastUpdated: new Date().toISOString(),
            unsubscribe: () => {}
          };
          continue;
        }

        const validatedScores = validateLeaderboardScores(scores.data?.scores || []);
        newBoards[board.id] = {
          board,
          scores: validatedScores || null,
          error: null,
          loading: false,
          lastUpdated: new Date().toISOString(),
          unsubscribe: () => {}
        };
      }

      runtimeStore.update(state => ({
        ...state,
        boards: newBoards,
        activeBoardId: boards[0]?.id || null
      }));
    } catch (error) {
      console.error('Error setting boards:', error);
      const currentState = get(runtimeStore);
      if (currentState.config.onError) {
        currentState.config.onError(error instanceof Error ? error : new Error('Unknown error'));
      }
      throw error;
    }
  },
  
  startRotation: () => {
    try {
      runtimeStore.update(state => {
        console.log('[boardRuntime] Starting rotation with:', {
          boardCount: Object.keys(state.boards).length,
          activeBoardId: state.activeBoardId,
          rotationIntervalMs: state.config.rotationIntervalMs
        });
        
        // Clear existing timer
        if (state.rotationTimer) {
          clearTimeout(state.rotationTimer);
        }
        
        // Set rotation enabled
        const newState = {
          ...state,
          config: {
            ...state.config,
            rotationEnabled: true
          }
        };
        
        // Start rotation timer
        if (Object.keys(state.boards).length > 1) {
          const nextRotationAt = Date.now() + state.config.rotationIntervalMs;
          const timer = setTimeout(() => {
            console.log('[boardRuntime] Timer fired, rotating to next board');
            rotateToNextBoard();
          }, state.config.rotationIntervalMs);
          
          console.log('[boardRuntime] Rotation timer set for', state.config.rotationIntervalMs, 'ms');
          
          return {
            ...newState,
            rotationTimer: timer,
            nextRotationAt
          };
        } else {
          console.log('[boardRuntime] Not enough boards for rotation:', Object.keys(state.boards).length);
        }
        
        return newState;
      });
    } catch (error) {
      const state = get(runtimeStore);
      if (state.config.onError) {
        state.config.onError(error instanceof Error ? error : new Error('Failed to start rotation'));
      }
      throw error;
    }
  },
  
  stopRotation: () => {
    try {
      runtimeStore.update(state => {
        // Clear rotation timer
        if (state.rotationTimer) {
          clearTimeout(state.rotationTimer);
        }
        
        return {
          ...state,
          config: {
            ...state.config,
            rotationEnabled: false
          },
          rotationTimer: null,
          nextRotationAt: null
        };
      });
    } catch (error) {
      const state = get(runtimeStore);
      if (state.config.onError) {
        state.config.onError(error instanceof Error ? error : new Error('Failed to stop rotation'));
      }
      throw error;
    }
  },
  
  setActiveBoard: (boardId) => {
    try {
      runtimeStore.update(state => {
        // Don't change if already active
        if (state.activeBoardId === boardId) return state;
        
        // Update active board
        return {
          ...state,
          activeBoardId: boardId,
          boardActivatedAt: Date.now().toString()
        };
      });
      
      // Subscribe to new active board
      subscribeToActiveBoard(boardId);
    } catch (error) {
      const state = get(runtimeStore);
      if (state.config.onError) {
        state.config.onError(error instanceof Error ? error : new Error('Failed to set active board'));
      }
      throw error;
    }
  },
  
  getStatus: () => get(runtimeStatus)
};

// Helper function to subscribe to a board's updates
function subscribeToActiveBoard(boardId: string) {
  const state = get(runtimeStore);
  const board = state.boards[boardId];
  if (!board) return;
  
  // Unsubscribe from previous board
  if (board.unsubscribe) {
    board.unsubscribe();
  }
  
  // Subscribe to new board
  const unsubscribe = subscribeToLeaderboard(board.board, (scores, error) => {
    runtimeStore.update(state => ({
      ...state,
      boards: {
        ...state.boards,
        [boardId]: {
          ...state.boards[boardId],
          scores,
          error: error ? new Error(error) : null,
          loading: false,
          lastUpdated: new Date().toISOString()
        }
      }
    }));
  });
  
  // Update board state with unsubscribe function
  runtimeStore.update(state => ({
    ...state,
    boards: {
      ...state.boards,
      [boardId]: {
        ...state.boards[boardId],
        unsubscribe
      }
    }
  }));
}

// Helper function to rotate to the next board
function rotateToNextBoard() {
  console.log('[boardRuntime] rotateToNextBoard called');
  
  const state = get(runtimeStore);
  const boardIds = Object.keys(state.boards);
  console.log('[boardRuntime] Available boards:', boardIds);
  
  if (boardIds.length <= 1) {
    console.log('[boardRuntime] Not enough boards for rotation');
    return;
  }
  
  // Add a 150ms delay to let transition overlay cover the screen first
  setTimeout(() => {
    runtimeStore.update(state => {
      // Find current index
      const currentIndex = boardIds.indexOf(state.activeBoardId || '');
      const nextIndex = (currentIndex + 1) % boardIds.length;
      const nextBoardId = boardIds[nextIndex];
      
      console.log('[boardRuntime] Rotating from', state.activeBoardId, 'to', nextBoardId);
      
      // Set next board as active
      return {
        ...state,
        activeBoardId: nextBoardId,
        nextRotationAt: Date.now() + state.config.rotationIntervalMs
      };
    });
    
    // Subscribe to new active board
    const newState = get(runtimeStore);
    if (newState.activeBoardId) {
      subscribeToActiveBoard(newState.activeBoardId);
    }
  }, 150); // 150ms delay to let transition overlay cover screen
  
  // Schedule next rotation
  runtimeStore.update(state => {
    const timer = setTimeout(() => {
      console.log('[boardRuntime] Next rotation timer fired');
      rotateToNextBoard();
    }, state.config.rotationIntervalMs);
    
    console.log('[boardRuntime] Next rotation scheduled for', state.config.rotationIntervalMs, 'ms');
    
    return {
      ...state,
      rotationTimer: timer
    };
  });
}

// Export the runtime and stores
export { boardRuntime, runtimeStatus, currentBoard, currentScores };
