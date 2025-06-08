# Utility Functions Review & Recommendations

## Current Structure

### 1. Core Utility Files

#### `codeUtils.ts`
- **Purpose**: Handles generation and validation of various codes (short codes, UUIDs)
- **Functions**:
  - `generateShortCode()`: Generates random alphanumeric codes
  - `generateAccessUUID()`: Creates UUID v4
  - `shortCodeExists()`: Checks DB for existing short codes
  - `accessUUIDExists()`: Checks DB for existing UUIDs
  - `generateUniqueShortCode()`: Generates unique short codes
  - `generateUniqueAccessUUID()`: Generates unique UUIDs
  - `isValidShortCode()`: Validates short code format
  - `isValidAccessUUID()`: Validates UUID format
  - `parseCodeAndUUID()`: Parses combined code strings

#### `eventStatus.ts`
- **Purpose**: Determines and formats event status information
- **Functions**:
  - `getEventStatus()`: Returns status object based on event dates/scores


#### `timeFilters.ts`
- **Purpose**: Time-based filtering utilities
- **Functions**:
  - `getTimeRangeCutoff()`: Gets timestamp for time ranges
  - `getTimeRangeLabel()`: Gets human-readable range labels


## Analysis & Recommendations

### Strengths
1. **Good Separation of Concerns**: Utilities are well-organized by domain
2. **Type Safety**: Strong TypeScript usage
3. **Pure Functions**: Most utilities follow functional patterns
4. **Documentation**: Good JSDoc comments

### Issues & Improvements (Updated)

#### 1. Code Duplication
- **Resolved**: All code/UUID validation and parsing is now in `codeUtils.ts`, shared by client and server.

#### 2. Potential Overlap with Stores
- **Resolved**: View mode logic and display logic are now handled in Svelte stores/components, not in utilities.

#### 3. Missing Test Coverage
- **Issue**: No visible test files for utilities
- **Recommendation**: Add unit tests for all utility functions

#### 4. Score Calculation Consistency
- **Issue**: Player score calculation logic is duplicated between scorecard and leaderboard.
- **Recommendation**: Create a shared `scoreUtils.ts` to ensure consistent, DRY calculation and ordering of player scores across the app.

### Current & Proposed Structure (as of 2025-06-08)

```
/src/lib/utils/
  codeUtils.ts      # Unified code/UUID generation, validation, parsing
  eventStatus.ts    # Event status logic (used by leaderboard, etc)
  timeFilters.ts    # Time-based event filtering
  scoreUtils.ts     # (Planned) Player score calculation and ordering
```

**Leaderboard pages now depend on:**
- `eventStatus.ts` (to determine event display/status)
- `timeFilters.ts` (to filter/slice events/leaders)
- `scoreUtils.ts` (to calculate and order player scores, replacing old logic)

---
    
  /leaderboard
    display.ts       # Display-related utilities
    sorting.ts       # Sorting logic
    
  /validation
    schemas/        # Zod schemas
    validators/     # Validation functions
    
  /server         # Server-only utils
    database.ts
    auth.ts
```

### New Utilities to Add

1. **Date/Time**
   - `formatDateTime()`: Consistent date/time formatting
   - `getRelativeTime()`: "2 hours ago" style formatting
   - `isToday()`/`isThisWeek()`: Date range checks

2. **Data Transformation**
   - `groupBy()`: Generic grouping function
   - `sortBy()`: Type-safe sorter
   - `filterBy()`: Composable filters

3. **UI/Formatting**
   - `formatScore()`: Consistent score display
   - `truncateText()`: Text truncation
   - `formatCurrency()`: Money formatting

4. **Validation**
   - `validateEmail()`: Email validation
   - `validatePassword()`: Password strength
   - `validateForm()`: Form validation helper

### Next Steps

#### 1. Type Safety Audit & Implementation
**Verification:**
- [ ] Search for `function` and `=>` patterns to find untyped functions
- [ ] Check for `any` types that could be more specific
- [ ] Look for missing input validation

**Implementation:**
- [ ] Add proper TypeScript types to all utility functions
- [ ] Replace `any` with specific types or generics
- [ ] Add runtime validation where needed
- [ ] Create type guards for complex types

#### 2. Documentation Review & Enhancement
**Verification:**
- [ ] Check for missing JSDoc in utility files
- [ ] Look for outdated or incorrect documentation
- [ ] Verify example usage in docs matches current implementation

**Implementation:**
- [ ] Add/update JSDoc for all utility functions
- [ ] Create a `utils/README.md` with:
  - Table of contents
  - Usage examples
  - Best practices
  - Contribution guidelines

#### 3. Test Coverage Improvement
**Verification:**
- [ ] Check existing test coverage with `npm test -- --coverage`
- [ ] Identify untested utility functions
- [ ] Look for missing edge cases in tests

**Implementation:**
- [ ] Write unit tests for untested utilities
- [ ] Add test cases for edge conditions
- [ ] Set up CI to enforce test coverage

#### 4. Refactoring & Code Quality
**Verification:**
- [ ] Look for code duplication across utility files
- [ ] Identify large files that could be split
- [ ] Find unused or deprecated functions

**Implementation:**
- [ ] Extract shared code into common modules
- [ ] Split large files into focused modules
- [ ] Remove or mark deprecated functions
- [ ] Standardize error handling patterns

#### 5. Performance Optimization
**Verification:**
- [ ] Profile utility functions for performance bottlenecks
- [ ] Identify expensive operations in hot code paths
- [ ] Check for unnecessary re-renders in UI utilities

**Implementation:**
- [ ] Memoize expensive calculations
- [ ] Optimize data transformation functions
- [ ] Implement lazy loading for large utilities
- [ ] Add performance tests for critical paths

## Conclusion

The current utility structure is solid but could benefit from better organization and reduced duplication. The proposed structure will make the codebase more maintainable and easier to navigate. Focus on moving shared code to common locations and adding comprehensive test coverage in the next phase.
