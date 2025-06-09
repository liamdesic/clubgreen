import { writable, derived } from 'svelte/store';
import { z } from 'zod';

// Schema for UI state validation
const uiStateSchema = z.object({
  // Fullscreen state
  isFullscreen: z.boolean().default(false),
  
  // Debug mode
  debugMode: z.boolean().default(false),
  
  // Active modal tracking
  activeModal: z.object({
    id: z.string().nullable(),
    data: z.any().optional()
  }).default({ id: null }),
  
  // Global loading states
  loadingStates: z.record(z.boolean()).default({}),
  
  // Global error state
  error: z.string().nullable().default(null),
  
  // Transition states
  isTransitioning: z.boolean().default(false),
  
  // Viewport information
  viewport: z.object({
    width: z.number().default(0),
    height: z.number().default(0),
    isMobile: z.boolean().default(false),
    isTablet: z.boolean().default(false),
    isDesktop: z.boolean().default(false)
  })
});

type UIState = z.infer<typeof uiStateSchema>;

/**
 * UIStateStore manages global UI state across the application.
 * It handles modals, loading states, viewport info, and other UI-related state.
 */
function createUIStateStore() {
  // Initialize with default values from schema
  const initialState: UIState = uiStateSchema.parse({});
  
  // Create the base store
  const { subscribe, update, set } = writable<UIState>(initialState);
  
  // Public methods
  const methods = {
    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen: () => {
      update(state => ({
        ...state,
        isFullscreen: !state.isFullscreen
      }));
    },
    
    /**
     * Toggle debug mode
     */
    toggleDebugMode: () => {
      update(state => ({
        ...state,
        debugMode: !state.debugMode
      }));
    },
    
    /**
     * Open a modal by ID with optional data
     */
    openModal: (modalId: string, data?: any) => {
      update(state => ({
        ...state,
        activeModal: {
          id: modalId,
          data
        }
      }));
    },
    
    /**
     * Close the currently open modal
     */
    closeModal: () => {
      update(state => ({
        ...state,
        activeModal: { id: null }
      }));
    },
    
    /**
     * Set a loading state for a specific key
     */
    setLoading: (key: string, isLoading: boolean) => {
      update(state => ({
        ...state,
        loadingStates: {
          ...state.loadingStates,
          [key]: isLoading
        }
      }));
    },
    
    /**
     * Set a global error message
     */
    setError: (error: string | null) => {
      update(state => ({
        ...state,
        error
      }));
    },
    
    /**
     * Clear the current error
     */
    clearError: () => {
      update(state => ({
        ...state,
        error: null
      }));
    },
    
    /**
     * Update viewport information
     */
    updateViewport: (width: number, height: number) => {
      update(state => ({
        ...state,
        viewport: {
          width,
          height,
          isMobile: width < 768,
          isTablet: width >= 768 && width < 1024,
          isDesktop: width >= 1024
        }
      }));
    },
    
    /**
     * Start a transition
     */
    startTransition: () => {
      update(state => ({
        ...state,
        isTransitioning: true
      }));
    },
    
    /**
     * End the current transition
     */
    endTransition: () => {
      update(state => ({
        ...state,
        isTransitioning: false
      }));
    }
  };
  
  // Derived state
  const isModalOpen = derived(
    { subscribe },
    ($state) => $state.activeModal.id !== null
  );
  
  const isLoading = derived(
    { subscribe },
    ($state) => Object.values($state.loadingStates).some(Boolean)
  );
  
  // Initialize viewport on client side
  if (typeof window !== 'undefined') {
    methods.updateViewport(window.innerWidth, window.innerHeight);
    
    window.addEventListener('resize', () => {
      methods.updateViewport(window.innerWidth, window.innerHeight);
    });
  }
  
  return {
    subscribe,
    ...methods,
    derived: {
      isModalOpen,
      isLoading
    }
  };
}

// Create and export the store
export const uiStateStore = createUIStateStore();

// Types
export type UIStateStore = ReturnType<typeof createUIStateStore>;

// Re-export types for external use
export type { UIState };
