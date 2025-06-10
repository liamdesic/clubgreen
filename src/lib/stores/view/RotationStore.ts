import { writable, derived } from 'svelte/store';
import type { LeaderboardBoard, LeaderboardRotationState } from '$lib/validations/leaderboardView';

function createRotationStore() {
  const { subscribe, set, update } = writable<LeaderboardRotationState>({
    boards: [],
    currentIndex: 0,
    intervalMs: 10000, // 10 seconds default
    timeRemaining: 0,
    currentBoard: null
  });

  let rotationInterval: NodeJS.Timeout | null = null;
  let countdownInterval: NodeJS.Timeout | null = null;

  function initialize(boards: LeaderboardBoard[], intervalMs = 10000) {
    // Clear any existing intervals
    if (rotationInterval) clearInterval(rotationInterval);
    if (countdownInterval) clearInterval(countdownInterval);

    set({
      boards,
      currentIndex: 0,
      intervalMs,
      timeRemaining: intervalMs,
      currentBoard: boards[0] || null
    });

    // Set up rotation interval
    rotationInterval = setInterval(() => {
      update(state => {
        const nextIndex = (state.currentIndex + 1) % state.boards.length;
        return {
          ...state,
          currentIndex: nextIndex,
          currentBoard: state.boards[nextIndex] || null,
          timeRemaining: state.intervalMs
        };
      });
    }, intervalMs);

    // Set up countdown interval
    countdownInterval = setInterval(() => {
      update(state => ({
        ...state,
        timeRemaining: Math.max(0, state.timeRemaining - 1000)
      }));
    }, 1000);
  }

  // Derived store for current board
  const currentBoard = derived({ subscribe }, $state => $state.currentBoard);

  // Derived store for rotation progress (0-100)
  const progress = derived({ subscribe }, $state => 
    (($state.intervalMs - $state.timeRemaining) / $state.intervalMs) * 100
  );

  // Cleanup function
  function cleanup() {
    if (rotationInterval) clearInterval(rotationInterval);
    if (countdownInterval) clearInterval(countdownInterval);
  }

  return {
    subscribe,
    initialize,
    currentBoard,
    progress,
    cleanup
  };
}

export const rotationStore = createRotationStore();
