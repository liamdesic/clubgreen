import { writable, derived, get } from 'svelte/store';
import type { LeaderboardBoard, LeaderboardBoardView } from '$lib/validations/leaderboardView';
import { rotationStore } from './RotationStore';
import { snapshotStore, subscribeToLeaderboard } from '$lib/stores/source/snapshotSource';
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

  // Load scores for a specific board using real-time snapshot
  function loadScores(board: LeaderboardBoard) {
    const key = `${board.eventId}-${board.timeFilter}`;
    
    update(views => ({
      ...views,
      [key]: {
        ...views[key],
        loading: true,
        error: null
      }
    }));

    // Subscribe to real-time updates for this board
    const unsubscribe = subscribeToLeaderboard(board.eventId, board.timeFilter);
    
    // Set up the subscription to update the store when snapshot changes
    const snapshotUnsubscribe = snapshotStore.subscribe((snapshot) => {
      if (snapshot && snapshot.event_id === board.eventId && snapshot.time_filter === board.timeFilter) {
        update(views => ({
          ...views,
          [key]: {
            ...views[key],
            scores: snapshot.scores || [],
            loading: false,
            lastUpdated: snapshot.updated_at || new Date().toISOString()
          }
        }));
      }
    });

    // Store the unsubscription function
    update(views => ({
      ...views,
      [key]: {
        ...views[key],
        _unsubscribe: () => {
          unsubscribe();
          snapshotUnsubscribe();
        }
      }
    }));
  }

  // Cleanup function
  function cleanup() {
    // Unsubscribe from rotation store
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    
    // Unsubscribe from all board subscriptions
    update(views => {
      Object.values(views).forEach(view => {
        if (view._unsubscribe) {
          view._unsubscribe();
        }
      });
      return {};
    });
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