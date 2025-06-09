import { writable, derived } from 'svelte/store';
import type { TimeFilter } from '$lib/validations/timeFilter';

export type Board = {
  eventId: string;
  timeFilter: TimeFilter;
};

interface RotationState {
  boards: Board[];
  currentIndex: number;
  intervalMs: number;
}

function createRotationStore() {
  const initialState: RotationState = {
    boards: [],
    currentIndex: 0,
    intervalMs: 15000
  };

  const { subscribe, set, update } = writable<RotationState>(initialState);
  let timer: ReturnType<typeof setInterval> | null = null;

  function initialize(boards: Board[], intervalMs: number) {
    if (timer) clearInterval(timer);
    set({ boards, currentIndex: 0, intervalMs });
    timer = setInterval(() => {
      update(state => ({
        ...state,
        currentIndex: (state.currentIndex + 1) % state.boards.length
      }));
    }, intervalMs);
  }

  const currentBoard = derived({ subscribe }, $state => $state.boards[$state.currentIndex] || null);

  return {
    subscribe,
    initialize,
    currentBoard
  };
}

export const rotationStore = createRotationStore();
