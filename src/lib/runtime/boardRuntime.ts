import { writable, derived, get } from 'svelte/store';
import type { Readable } from 'svelte/store';
import type { LeaderboardBoard, BoardState, BoardRuntimeConfig, BoardRuntimeStatus } from './board.types';
import { subscribeToLeaderboard } from './scoreSnapshot';

// Internal state interface
interface InternalState {
  /** List of all configured boards */
  boards: Map<string, BoardState>;
  
  /** ID of the currently active board */
  activeBoardId: string | null;
  
  /** Rotation timer ID */
  rotationTimer: NodeJS.Timeout | null;
  
  /** Time when the current board was activated */
  boardActivatedAt: number | null;
  
  /** Configuration */
  config: BoardRuntimeConfig;
  
  /** Whether the runtime is initialized */
  initialized: boolean;
}

const initialState: InternalState = {
  boards: new Map(),
  activeBoardId: null,
  rotationTimer: null,
  boardActivatedAt: null,
  config: {
    rotationIntervalMs: 10000, // 10 seconds default
    rotationEnabled: true,
  },
  initialized: false,
};

// Create the store
const { subscribe, update } = writable<InternalState>(initialState);

console.log('boardRuntime - Store created:', {
  subscribe: typeof subscribe,
  update: typeof update,
  initialState
});

// Helper to get the current state
function getState(): InternalState {
  const state = get({ subscribe });
  console.log('boardRuntime - getState:', state);
  return state;
}

// Helper to update state
function setState(updater: (state: InternalState) => InternalState) {
  console.log('boardRuntime - setState called');
  update(updater);
}

// Add helper function after setState and getState
function subscribeToActiveBoard() {
  setState(state => {
    const { activeBoardId, boards } = state;
    if (!activeBoardId) return state;

    const current = boards.get(activeBoardId);
    if (!current) return state;

    // Clean up any previous subscription
    current.unsubscribe?.();

    const unsubscribe = subscribeToLeaderboard(current.board, (scores, error) => {
      setState(s => {
        const updatedBoards = new Map(s.boards);
        const target = updatedBoards.get(activeBoardId);
        if (!target) return s;

        updatedBoards.set(activeBoardId, {
          ...target,
          scores,
          error,
          loading: false,
          lastUpdated: new Date().toISOString(),
        });

        return {
          ...s,
          boards: updatedBoards,
        };
      });
    });

    const updatedBoards = new Map(boards);
    updatedBoards.set(activeBoardId, {
      ...current,
      unsubscribe,
    });

    return {
      ...state,
      boards: updatedBoards,
    };
  });
}

/**
 * Initialize the board runtime with configuration
 */
function initialize(config: Partial<BoardRuntimeConfig> = {}) {
  console.log('boardRuntime - initialize called with config:', config);
  
  setState(state => {
    console.log('boardRuntime - initialize updating state');
    return {
      ...state,
      config: {
        ...state.config,
        ...config,
      },
      initialized: true,
    };
  });
  
  // Start rotation if enabled
  if (config.rotationEnabled !== false) {
    console.log('boardRuntime - initialize starting rotation');
    startRotation();
  }
  
  // Cleanup on destroy
  return () => {
    console.log('boardRuntime - initialize cleanup called');
    stopRotation();
    setState(state => {
      state.boards.forEach(board => {
        board.unsubscribe?.();
      });
      return { ...initialState };
    });
  };
}

/**
 * Add or update boards in the runtime
 */
function setBoards(boards: LeaderboardBoard[]) {
  setState(state => {
    const newBoards = new Map(state.boards);
    
    // Update or add new boards
    boards.forEach(board => {
      const existing = newBoards.get(board.id);
      
      if (existing) {
        // Update existing board
        newBoards.set(board.id, {
          ...existing,
          board: {
            ...existing.board,
            ...board,
          },
        });
      } else {
        // Add new board
        newBoards.set(board.id, {
          board,
          scores: null,
          error: null,
          loading: false,
          lastUpdated: null,
          unsubscribe: () => {},
        });
      }
    });
    
    // If no active board, set the first one
    let activeBoardId = state.activeBoardId;
    if (!activeBoardId && boards.length > 0) {
      activeBoardId = boards[0].id;
    }
    
    return {
      ...state,
      boards: newBoards,
      activeBoardId,
    };
  });

  // Call subscribeToActiveBoard after state update
  setTimeout(() => {
    subscribeToActiveBoard();
  }, 0);
}

/**
 * Start the board rotation
 */
function startRotation() {
  setState(state => {
    if (state.rotationTimer || !state.config.rotationEnabled) {
      return state;
    }
    
    const timer = setInterval(() => {
      rotateToNextBoard();
    }, state.config.rotationIntervalMs);
    
    return {
      ...state,
      rotationTimer: timer,
      boardActivatedAt: Date.now(),
    };
  });
}

/**
 * Stop the board rotation
 */
function stopRotation() {
  setState(state => {
    if (state.rotationTimer) {
      clearInterval(state.rotationTimer);
    }
    return {
      ...state,
      rotationTimer: null,
      boardActivatedAt: null,
    };
  });
}

/**
 * Rotate to the next available board
 */
function rotateToNextBoard() {
  setState(state => {
    const boardIds = Array.from(state.boards.keys());
    if (boardIds.length === 0) return state;
    
    const currentIndex = state.activeBoardId ? boardIds.indexOf(state.activeBoardId) : -1;
    const nextIndex = (currentIndex + 1) % boardIds.length;
    const nextBoardId = boardIds[nextIndex];
    
    return {
      ...state,
      activeBoardId: nextBoardId,
      boardActivatedAt: Date.now(),
    };
  });
}

/**
 * Set the active board by ID
 */
function setActiveBoard(boardId: string) {
  setState(state => ({
    ...state,
    activeBoardId: boardId,
    boardActivatedAt: Date.now(),
  }));

  // Call subscribeToActiveBoard after state update
  setTimeout(() => {
    subscribeToActiveBoard();
  }, 0);
}

/**
 * Get the current runtime status
 */
function getStatus(): BoardRuntimeStatus {
  const state = getState();
  const now = Date.now();
  
  return {
    activeBoardId: state.activeBoardId,
    timeUntilRotation: state.boardActivatedAt 
      ? Math.max(0, state.config.rotationIntervalMs - (now - state.boardActivatedAt))
      : 0,
    isRotating: !!state.rotationTimer,
    lastUpdated: state.boards.get(state.activeBoardId || '')?.lastUpdated || null,
    boardCount: state.boards.size,
  };
}

// Derived stores for common use cases
export const activeBoard = derived(
  { subscribe },
  ($state) => {
    console.log('activeBoard - derived store update:', $state);
    if (!$state.activeBoardId) return null;
    return $state.boards.get($state.activeBoardId)?.board || null;
  }
);

export const currentScores = derived(
  { subscribe },
  ($state) => {
    console.log('currentScores - derived store update:', $state);
    if (!$state.activeBoardId) return null;
    return $state.boards.get($state.activeBoardId)?.scores || null;
  }
);

export const runtimeStatus = derived(
  { subscribe },
  ($state) => {
    console.log('runtimeStatus - derived store update:', $state);
    return getStatus();
  }
);

console.log('boardRuntime - Derived stores created:', {
  activeBoard: typeof activeBoard.subscribe,
  currentScores: typeof currentScores.subscribe,
  runtimeStatus: typeof runtimeStatus.subscribe
});

// Public API
export const boardRuntime = {
  subscribe,
  initialize,
  setBoards,
  startRotation,
  stopRotation,
  setActiveBoard,
  getStatus,
};

export type BoardRuntime = typeof boardRuntime;
