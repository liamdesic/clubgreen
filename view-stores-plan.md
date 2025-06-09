# View Stores Architecture Plan

> **Reference Documentation**
> - For detailed type definitions, store implementations, and utility functions, see [THE-BRAIN-TYPES-STORES-UTILS-FUNCTIONS.md](./THE-BRAIN-TYPES-STORES-UTILS-FUNCTIONS.md)
> - For authentication and system architecture details, see [THE-BRAIN-SYSTEMS-AUTH.md](./THE-BRAIN-SYSTEMS-AUTH.md)
> - Always check these documents before implementing new functionality to ensure consistency

## Core Principles

1. **Data Flow**
   ```
   Database → Source Stores → View Stores → UI Components
   ```

2. **Layered Architecture**
   - **Data Layer**: Source Stores (data access, real-time updates)
   - **Domain Layer**: Business logic, transformations, validations
   - **UI Layer**: View Stores (derived state), Components

3. **Cross-Cutting Concerns**
   - **Utilities**: Pure functions used across all layers
     - `validations/`: Schema and data validation
     - `formatters/`: Data presentation (dates, numbers, etc.)
     - `calculations/`: Business logic and derived data
     - `transformers/`: Data normalization/denormalization

4. **Type Safety**
   - Runtime validation with Zod
   - TypeScript types from schemas
   - No `any` types
   - Single source of truth for types (`database.types.ts`)

## Foundational Source Stores

### Already Implemented
- **`eventSource`**: Central store for all event data operations
- **`orgSource`**: Manages organization data and settings
- **`scoresSource`**: Handles score data with real-time updates and offline support

## Implementation Guidelines

### 1. Implementation Priority
1. **Phase 1 - Core Infrastructure**
   - Start with `LeaderboardViewStore` (highest impact)
   - Then `UIStateStore` (foundational for UI interactions)
   - Follow with `RotationStore` and `ScoreStatsStore`

2. **Directory Structure**
   ```
   src/lib/stores/
   ├── source/         # Existing source stores
   └── views/          # New view stores
       ├── leaderboard/
       ├── ui/
       ├── rotation/
       └── scores/
   ```

### 2. Technical Stack
- **State Management**: Svelte's built-in stores (writable/derived)
- **Testing**: Vitest (configured in project)
- **Documentation**: JSDoc comments in source files
- **Validation**: Zod schemas (existing pattern)

### 3. Development Standards

#### Code Style
- Follow patterns from `eventSource.ts` and other source stores
- Use `camelCase` for methods and variables
- Use TypeScript types from validation schemas
- Keep store methods pure where possible

#### Error Handling
- Follow error handling pattern from `eventSource.ts`
- Use store's error state for error handling
- Implement loading states for async operations

### 4. Performance
- Use `derived` for computed values
- Implement loading states for async operations
- Consider debouncing for expensive operations if needed

### 5. Testing Strategy
- Use Vitest for unit testing
- Test store methods and reactions
- Mock Supabase client for store tests

### 6. Documentation
- Use JSDoc for all public methods and types
- Document store dependencies and side effects
- Follow existing documentation patterns

### 7. Directory Structure
```
src/lib/stores/
├── source/         # Existing source stores
│   ├── eventSource.ts
│   ├── orgSource.ts
│   └── scoresSource.ts
└── view/           # New view stores
    ├── leaderboard/  # Leaderboard-related stores
    └── index.ts     # Public exports
```

## Proposed View Stores Architecture

### ✅ 1. LeaderboardViewStore - COMPLETED
- **Purpose**: Centralize leaderboard state and derived data
- **Used By**: All leaderboard pages, dashboard widgets
- **Features**:
  - ✅ Derived leaderboards with player stats aggregation
  - ✅ Score processing with time-based filtering
  - ✅ Sorting by score, name, or last updated
  - ✅ Real-time updates through scoresSource integration
  - ✅ Type-safe with Zod validation
  - ✅ Search and filter functionality

### ✅ 2. UIStateStore - COMPLETED
- **Purpose**: Manage shared UI state across the application
- **Used By**: All major app sections
- **Features**:
  - ✅ Fullscreen state management
  - ✅ Debug mode toggle
  - ✅ Modal management with data support
  - ✅ Global loading states with key-based tracking
  - ✅ Global error handling
  - ✅ Viewport detection (mobile/tablet/desktop)
  - ✅ Transition state management
  - ✅ Type-safe with Zod validation

### 3. RotationStore
- **Purpose**: Handle event rotation logic
- **Used By**: Multi-board and org leaderboards
- **Features**:
  - Rotation timing and intervals
  - Current event tracking
  - Play/pause controls
  - Transition management

### 4. ScoreStatsStore
- **Purpose**: Centralize score calculations and statistics
- **Used By**: Leaderboards, dashboard, scorecard
- **Features**:
  - Score aggregation
  - Player statistics
  - Historical comparisons
  - Performance metrics

## Implementation Guidelines

1. **Single Responsibility**
   - Each store has a clear, focused purpose
   - Compose complex state from simpler stores

2. **Reactive Composition**
   - Use derived stores for computed values
   - Leverage Svelte's reactive declarations

3. **Performance**
   - Implement proper cleanup for subscriptions
   - Debounce expensive operations
   - Memoize derived state where appropriate

4. **Testing**
   - Each store should be independently testable
   - Test both synchronous and asynchronous operations
   - Mock external dependencies

5. **Documentation**
   - Document all public APIs in THE-BRAIN.md
   - Include usage examples
   - Document edge cases and error states

## Migration Strategy

### Phase 1: Core Infrastructure
1. Set up store skeletons with TypeScript interfaces
2. Implement basic store functionality
3. Add comprehensive test coverage

### Phase 2: Incremental Adoption
1. Create adapter functions for legacy components
2. Migrate one feature area at a time
3. Use feature flags for gradual rollout

### Phase 3: Cleanup
1. Remove adapter code
2. Delete deprecated components
3. Update documentation

## Cross-Cutting Concerns

### Validation
- Use centralized schemas from `validations.ts`
- Validate all external inputs
- Provide meaningful error messages

### Error Handling
- Consistent error handling patterns
- User-friendly error messages
- Error recovery strategies

### Performance
- Optimize store subscriptions
- Implement pagination for large datasets
- Cache expensive computations

### Accessibility
- Keyboard navigation
- ARIA attributes
- Focus management

## Next Steps

1. [ ] Finalize store interfaces and types
2. [ ] Implement core store functionality
3. [ ] Write comprehensive tests
4. [ ] Document public APIs
5. [ ] Create migration guides

*This document will be updated as the architecture evolves.*
