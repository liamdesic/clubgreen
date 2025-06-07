import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

interface RotationState {
  paused: boolean;
  timeRemaining: number;
  interval: number;
  transitioning: boolean;
}

function createRotationStore() {
  const initialState: RotationState = {
    paused: false,
    timeRemaining: 15, // Default 15 seconds
    interval: 15000,   // Default 15000 ms
    transitioning: false
  };

  const { subscribe, set, update } = writable<RotationState>(initialState);

  // Timer reference
  let timer: ReturnType<typeof setInterval> | null = null;
  let startTime: number = 0;
  
  // Callback for rotation
  let rotateCallback: (() => Promise<void>) | null = null;

  // Start the rotation timer
  function startTimer() {
    if (!browser || timer !== null) return;
    
    // Record the start time for accurate time tracking
    startTime = Date.now();
    
    // Clear any existing timer
    stopTimer();
    
    // Set up a new timer that updates frequently for smooth countdown
    timer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      let state: RotationState;
      
      // Update the time remaining
      update(s => {
        state = s;
        return {
          ...s,
          timeRemaining: Math.max(0, Math.ceil((s.interval - elapsed) / 1000))
        };
      });
      
      // Check if it's time to rotate
      if (elapsed >= state!.interval && !state!.transitioning && !state!.paused) {
        // Trigger rotation
        if (rotateCallback) {
          // Set transitioning state
          update(s => ({ ...s, transitioning: true }));
          
          // Execute rotation callback
          rotateCallback().finally(() => {
            // Reset timer and transitioning state
            startTime = Date.now();
            update(s => ({ ...s, transitioning: false }));
          });
        }
      }
    }, 200); // Update every 200ms for smooth countdown
  }

  // Stop the rotation timer
  function stopTimer() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  return {
    subscribe,
    
    // Initialize with configuration
    initialize(interval: number = 15000, onRotate: () => Promise<void>) {
      rotateCallback = onRotate;
      
      update(state => ({
        ...state,
        interval,
        timeRemaining: Math.ceil(interval / 1000),
        paused: false,
        transitioning: false
      }));
      
      // Start the timer
      startTimer();
    },
    
    // Pause rotation
    pause() {
      update(state => ({ ...state, paused: true }));
      stopTimer();
    },
    
    // Resume rotation
    resume() {
      update(state => ({ ...state, paused: false }));
      startTime = Date.now(); // Reset start time
      startTimer();
    },
    
    // Toggle pause state
    togglePause() {
      let isPaused: boolean;
      update(state => {
        isPaused = !state.paused;
        return { ...state, paused: isPaused };
      });
      
      if (isPaused) {
        stopTimer();
      } else {
        startTime = Date.now(); // Reset start time
        startTimer();
      }
    },
    
    // Set a new interval
    setInterval(newInterval: number) {
      update(state => ({
        ...state,
        interval: newInterval,
        timeRemaining: Math.ceil(newInterval / 1000)
      }));
      
      // Restart timer with new interval if not paused
      if (!timer && !this.isPaused()) {
        startTime = Date.now();
        startTimer();
      }
    },
    
    // Force an immediate rotation
    async rotateNow() {
      if (rotateCallback && !this.isTransitioning()) {
        update(s => ({ ...s, transitioning: true }));
        
        try {
          await rotateCallback();
        } finally {
          // Reset timer and transitioning state
          startTime = Date.now();
          update(s => ({ ...s, transitioning: false }));
        }
      }
    },
    
    // Helper methods
    isPaused() {
      let paused = false;
      update(s => {
        paused = s.paused;
        return s;
      });
      return paused;
    },
    
    isTransitioning() {
      let transitioning = false;
      update(s => {
        transitioning = s.transitioning;
        return s;
      });
      return transitioning;
    },
    
    // Clean up resources
    cleanup() {
      stopTimer();
      rotateCallback = null;
    }
  };
}

// Create and export the store
export const rotationStore = createRotationStore();

// Derived stores for convenience
export const isPaused = derived(rotationStore, $store => $store.paused);
export const timeRemaining = derived(rotationStore, $store => $store.timeRemaining);
export const isTransitioning = derived(rotationStore, $store => $store.transitioning);
