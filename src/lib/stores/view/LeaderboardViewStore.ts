import { writable, derived, get } from 'svelte/store';
import type { LeaderboardBoard, LeaderboardBoardView } from '$lib/validations/leaderboardView';
import { rotationStore } from './RotationStore';
import { scoresSource } from '$lib/stores/source/scoresSource';
import { getTimeRangeCutoff } from '$lib/utils/timeFiltersUtils';
import { aggregatePlayerScores } from '$lib/utils/scoreCalculator';
import { onDestroy } from 'svelte';

function createLeaderboardViewStore() {
  const { subscribe, set, update } = writable<Record<string, LeaderboardBoardView>>({});
  let unsubscribe: (() => void) | null = null;

  // Get the current view based on rotationStore's currentBoard
  const currentView = derived(
    [rotationStore, { subscribe }],
    ([$rotation, $views]) => {
      const currentBoard = $rotation.currentBoard;
      if (!currentBoard) return null;
      
      const key = `${currentBoard.eventId}-${currentBoard.timeFilter}`;
      return $views[key] || null;
    }
  );

  // Initialize views for a set of boards
  async function initializeBoards(boards: LeaderboardBoard[]) {
    // Create empty views for all boards
    const initialViews: Record<string, LeaderboardBoardView> = {};
    boards.forEach(board => {
      const key = `${board.eventId}-${board.timeFilter}`;
      initialViews[key] = {
        board,
        scores: [],
        loading: false,
        error: null
      };
    });

    set(initialViews);

    // Load scores for the current board
    const currentBoard = get(rotationStore).currentBoard;
    if (currentBoard) {
      await loadScores(currentBoard);
    }

    // Subscribe to rotation changes to load new board data
    unsubscribe = rotationStore.subscribe(state => {
      if (state.currentBoard) {
        loadScores(state.currentBoard);
      }
    });
  }

  // Load scores for a specific board
  async function loadScores(board: LeaderboardBoard) {
    const key = `${board.eventId}-${board.timeFilter}`;
    
    update(views => ({
      ...views,
      [key]: {
        ...views[key],
        loading: true,
        error: null
      }
    }));

    try {
      const cutoff = getTimeRangeCutoff(board.timeFilter);
      const scores = await scoresSource.fetchScores(board.eventId);

      const aggregatedScores = aggregatePlayerScores(scores);

      update(views => ({
        ...views,
        [key]: {
          ...views[key],
          scores: aggregatedScores,
          loading: false,
          lastUpdated: new Date().toISOString()
        }
      }));

    } catch (error) {
      update(views => ({
        ...views,
        [key]: {
          ...views[key],
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load scores'
        }
      }));
    }
  }

  // Cleanup function
  function cleanup() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  }

  return {
    subscribe,
    initializeBoards,
    loadScores,
    currentView,
    cleanup
  };
}

export const leaderboardViewStore = createLeaderboardViewStore(); 