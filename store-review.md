# Store Review

_Last updated: 2025-06-08_

This document reviews the current Svelte stores in the codebase, focusing on:
- Inputs and outputs
- Type clarity and canonical usage
- Missing fields vs. canonical types
- Clarity/readability
- Recommendations (including suggested new stores)

---

## 1. `LeaderboardStore.ts`

**Inputs/Outputs:**
- **Inputs:** Organization ID, events (from Supabase), scorecard rows, time filters
- **Outputs:** Leaderboard state (loading, error, events, displayableEvents, indices, score counts, event leaderboards, time filters, current filter)

**Type Usage:**
- Uses custom `Score`, `PlayerScore`, and `LeaderboardState` interfaces
- **Issue:** Types are redefined locally instead of imported from `models.ts` (risking drift)

**Clarity:**
- Logic is well-encapsulated: initialization, loading, processing, real-time updates
- Derived stores for current event and leaderboard are clear

**Missing/Redundant:**
- Should use `Scorecard`, `PlayerScore`, and `Event` from `models.ts` exclusively
- `ScoreTimeRange` should be replaced with canonical `TimeFilter`
- Remove any duplicate interfaces

**Recommendations:**
- Refactor all type imports to use only canonical types from `models.ts`
- Remove redefined/duplicate interfaces
- Add JSDoc comments for methods/derived stores
- Consider splitting into smaller stores if needed for other entities

---

## 2. `playerStore.ts`

**Inputs/Outputs:**
- **Inputs:** Array of `Scorecard` (raw score rows)
- **Outputs:** Aggregated `PlayerScore[]`, scores grouped by event, helper for event stats

**Type Usage:**
- ✅ Uses only canonical `Scorecard` and `PlayerScore` from `models.ts`

**Clarity:**
- Store is simple, focused, and well-typed
- Aggregation logic is clear and DRY

**Missing:**
- None; matches canonical types well

**Recommendations:**
- Extend `PlayerScore` in `models.ts` and update aggregation if more stats are needed
- If player metadata is needed, consider a dedicated player profile store

---

## 3. `RotationStore.ts`

**Inputs/Outputs:**
- **Inputs:** Timer interval, rotation callback
- **Outputs:** Rotation state (paused, timeRemaining, interval, transitioning) and derived stores

**Type Usage:**
- Uses a local `RotationState` interface (UI-only, not in `models.ts`)

**Clarity:**
- Well-structured, clear timer/rotation logic
- All state transitions are explicit

**Missing:**
- None for its purpose

**Recommendations:**
- If rotation state needs to be persisted/shared, consider syncing with localStorage or Supabase

---

## 4. `ThemeStore.ts`

**Inputs/Outputs:**
- **Inputs:** Accent color, logo URL
- **Outputs:** Theme state (accentColor, logoUrl), derived CSS variables

**Type Usage:**
- Uses a local `ThemeState` interface (UI-only)
- If syncing with organization settings, consider using `OrganizationSettings` from `models.ts`

**Clarity:**
- Clear, focused, encapsulates all theme logic

**Missing:**
- Add more theme fields as needed (e.g., dark mode, font)

**Recommendations:**
- If theme is org-specific, sync with org settings and use canonical types

---

## 5. `eventStore.ts`

**Inputs/Outputs:**
- **Inputs:** Array of `Event` (from Supabase), score counts
- **Outputs:** Derived stores for active, archived, live, upcoming events

**Type Usage:**
- **Issue:** Imports `Event` from old `types.ts` (should be from `models.ts`)

**Clarity:**
- Logic is clear, derived stores are well-named

**Missing:**
- Should use only canonical `Event` type
- Update if new event fields are added in `models.ts`

**Recommendations:**
- Refactor to import `Event` from `models.ts`
- Use `EventSettings` if managing event settings/metadata

---

## Summary Table

| Store            | Canonical Types? | Inputs/Outputs                 | Clarity | Missing/Redundant | Recommendations                      |
|------------------|------------------|-------------------------------|---------|-------------------|--------------------------------------|
| LeaderboardStore | ❌ (needs update) | Org ID, events, scorecards    | High    | Types drift       | Refactor to use `models.ts` types    |
| playerStore      | ✅               | Scorecard[] → PlayerScore[]   | High    | None              | Extend if more stats needed          |
| RotationStore    | N/A (UI only)    | Timer config, callback        | High    | None              | Fine as is                          |
| ThemeStore       | N/A (UI only)    | Accent color, logo URL        | High    | None              | Sync with org settings if needed     |
| eventStore       | ❌ (needs update) | Event[], score counts         | High    | Types drift       | Refactor to use `models.ts` types    |

---

## General Recommendations & Missing Stores

- **Refactor all stores to use only canonical types from `models.ts`**
- Remove duplicate/outdated type definitions
- Add JSDoc comments for public store methods
- Potential new stores:
  - **User/Auth Store:** For current user/session state
  - **Organization Store:** For org-wide settings/state
  - **Notification Store:** For global notifications/errors
  - **Settings Store:** For app/user settings

---

_This review is intended to help you keep your app foundation clear, DRY, and maintainable as you scale._
