# Leaderboard System Refactor & Audit

---

## All Leaderboard Related Files:

### Routes
- `src/routes/[org]/lb/[shortcode]/+page.svelte`  (event leaderboard)
- `src/routes/[org]/[code]/+page.svelte`           (event scorecard/leaderboard)
- `src/routes/[org]/ob/[code]/+page.svelte`        (org leaderboard)
- `src/routes/[org]/mb/[code]/+page.svelte`        (org leaderboard, mobile)

### Components
- `src/lib/components/EventLeaderboardView.svelte`
- `src/lib/components/LeaderboardManager.svelte`
- `src/lib/components/TransitionOverlay.svelte`
- `src/lib/components/LeaderboardRotationStatus.svelte`
- `src/lib/components/MainLeaderboardCard.svelte`
- `src/lib/components/OrgLeaderboardView.svelte`
- `src/lib/components/EventCard.svelte`
- `src/lib/components/LeaderboardModal.svelte`
- `src/lib/components/LeaderboardController.svelte`
- `src/lib/components/TimeRangeSelector.svelte`
- `src/lib/components/TimeRangeBadge.svelte`
- `src/lib/components/ScorecardView.svelte`
- `src/lib/components/AddEventCard.svelte`
- `src/lib/components/EventSections/index.svelte`
- `src/lib/QRCodeModal.svelte`

### Stores
- `src/lib/stores/LeaderboardStore.ts`
- `src/lib/stores/RotationStore.ts`
- `src/lib/stores/ThemeStore.ts`
- `src/lib/stores/eventStore.ts`
- `src/lib/stores/playerStore.ts`

### Utils
- `src/lib/utils/leaderboard.ts`
- `src/lib/utils/timeFilters.ts`
- `src/lib/utils/eventStatus.ts`
- `src/lib/utils/viewModes.ts`  (legacy/unused)

### Types
- `src/lib/types/leaderboard.ts`
- `src/lib/types/application/leaderboard.ts`
- `src/lib/types/event.ts`
- `src/lib/types/score.ts`

### Styles
- `src/lib/styles/leaderboard.css`
- `src/lib/styles/scorecard.css`
- `src/lib/styles/EditEvent.css`

---

## Overview
This document provides a critical, high-level analysis of the current leaderboard flow in the codebase, covering all components, stores, and logic from database import to the two front-facing pages: `/lb` (event leaderboard) and `/ob` (organization leaderboard). The analysis is intentionally skeptical, focusing on bloat, redundancy, unclear responsibilities, and unused or overly complex features.

---

## 1. Route and Page Structure

- **/lb** → `/src/routes/[org]/lb/[shortcode]/+page.svelte`
- **/ob** → `/src/routes/[org]/ob/[code]/+page.svelte`

Both are large Svelte files (350+ lines), handling data loading, error states, and passing props to view/manager components. They duplicate logic for loading organization/event data and setting up UI state.

### Observations
- **Redundant Data Fetching:** Both pages fetch organization/event data, apply accent colors, and manage loading/error states independently. This is repeated logic that could be abstracted.
- **Too Much In-Component Logic:** The pages implement their own data loading, error handling, and even some UI state logic, rather than delegating to stores or utility modules.
- **Debug/Dev Code:** `/lb` includes toggles and logs for a debug mode, with localStorage and URL param logic that feels like legacy dev tooling.
- **UI/State Mixing:** Both pages mix UI rendering with imperative state management, making them harder to test and reason about.

---

## 2. Core Components

### EventLeaderboardView.svelte (766 lines)
- Handles rendering of the event leaderboard, including score tables, QR code generation, ad display, and sidebar.
- Accepts a huge number of props, including both raw and pre-processed data, and has logic to hydrate from Supabase if required.
- Implements its own data processing (score aggregation, sorting), error handling, and even real-time updates.
- Contains a lot of UI logic (score tables, badges, QR, ads) and state management.

#### Problems
- **Bloated Responsibilities:** Does data fetching, transformation, real-time updates, and UI rendering all in one place.
- **Unused/Legacy Props:** Many props (e.g., `hydrateFromSupabase`, `showAds`, `showErrorMessages`, etc.) are toggled but not always used, suggesting legacy or dead code.
- **Duplicate Logic:** Score processing and leaderboard aggregation are repeated in other components and stores.
- **Sidebar/Ad Logic:** Ad/QR display logic is mixed with core leaderboard rendering, making the component harder to reuse or test.

### LeaderboardManager.svelte (1000+ lines)
- Controls the rotating display of multiple events for an organization.
- Handles data fetching for all events, rotation logic, time filters, real-time updates, and UI transitions.
- Manages its own state for loading, errors, event lists, score counts, and rotation timers.
- Imports and controls EventLeaderboardView and TransitionOverlay.

#### Problems
- **Monolithic:** Does everything: data loading, rotation, filtering, error handling, transitions, and UI.
- **Repeated State/Logic:** Rotation, event/time filter state, and data fetching are also implemented in stores (see below).
- **Real-Time Updates:** Realtime logic is duplicated here and in EventLeaderboardView and the store.
- **Controls/Timers:** UI controls and timer logic are deeply embedded, making it hard to swap out or test.
- **TransitionOverlay Coupling:** Handles transition overlays internally, but similar overlays are triggered by parent pages too.

### TransitionOverlay.svelte
- Handles animated transitions between events.
- Accepts accent color, logo, and duration props.
- Purely presentational, but is tightly coupled to parent state/logic.

---

## 3. Stores

### LeaderboardStore.ts (481 lines)
- Implements a Svelte store for leaderboard state: events, displayable events, current event/filter, score counts, and leaderboards.
- Provides methods for initialization, data fetching, score processing, real-time updates, and rotation.
- Exports derived stores for current event/leaderboard and convenience helpers.

#### Problems
- **Redundant with Components:** Most logic here (data fetching, score aggregation, rotation, real-time) is also implemented in LeaderboardManager and EventLeaderboardView.
- **Unused/Partial Adoption:** The store is not used consistently—some pages/components fetch/process data independently.
- **Bloat:** Contains logic for all event/time filter rotation, but so do components.
- **Unclear Ownership:** It's unclear whether the store or components are the source of truth for leaderboard state.

### RotationStore.ts
- Implements a Svelte store for rotation state (paused, timeRemaining, interval, transitioning) and timer logic.
- Exposes methods to start/stop/pause/toggle rotation, set intervals, and force rotation.

#### Problems
- **Redundant:** Rotation logic is also implemented in LeaderboardManager and (to some extent) in the page files.
- **Unused:** Not clearly referenced in main page/component flows; may be legacy or only partially adopted.

---

## 4. General Critique

- **Bloat and Duplication:** Core logic (data fetching, score aggregation, real-time updates, rotation) is repeated across page files, components, and stores.
- **Components Doing Too Much:** Especially EventLeaderboardView and LeaderboardManager, which both fetch/process data, manage state, and render UI.
- **Unused/Legacy Features:** Debug toggles, hydrateFromSupabase, showAds, showErrorMessages, and rotationStore look like legacy or partially removed features.
- **Unclear Data Flow:** It's not clear if the store or the components are the single source of truth. Some components ignore the store and fetch/process their own data.
- **Testing and Maintenance Risk:** The system is hard to test or refactor due to tight coupling, repeated logic, and unclear boundaries.
- **UI/State Mixing:** Pages and components mix UI rendering with imperative state logic, making them hard to reason about.

---

## 5. Recommendations

- **Centralize Data Logic:** Move all data fetching, aggregation, and real-time logic into a single store. Components/pages should subscribe to store state, not fetch/process independently.
- **Thin Components:** Refactor EventLeaderboardView and LeaderboardManager to be presentational only, with all state/data injected via props or stores.
- **Remove Legacy/Unused Code:** Audit for unused props, toggles, and stores (e.g., hydrateFromSupabase, debug toggles, RotationStore) and remove them.
- **Clear Ownership:** Establish clear boundaries: stores own state, components render UI, pages handle routing only.
- **DRY Up Logic:** Abstract repeated code (error/loading handling, accent color logic, event/org fetching) into utilities or hooks.
- **Improve Testability:** Decouple UI from data/state logic to make testing and maintenance easier.

---

## 6. Summary Table

| Area                  | Problematic Patterns                  | Example(s)                 |
|-----------------------|---------------------------------------|----------------------------|
| Data Fetching         | Duplicated in pages, components, store| /lb, /ob, LeaderboardManager|
| State Management      | Split between store & components      | LeaderboardStore, Manager  |
| Real-Time Updates     | Implemented in multiple places        | Store, EventLeaderboardView|
| Rotation Logic        | Exists in store, component, and RotationStore | Manager, RotationStore|
| Legacy/Unused Features| Debug toggles, hydrate, RotationStore | Many props/stores unused   |
| UI/State Mixing       | Components handle both                | EventLeaderboardView       |

---

# Conclusion
The leaderboard system is currently bloated, with repeated logic, unclear responsibilities, and legacy/unused features. A major refactor should focus on centralizing state/data logic, thinning out components, and removing dead code to improve maintainability and clarity.

---

## File-by-File Audit: Leaderboard Utilities & Types

This section reviews the key utility and type files supporting the leaderboard system. For each, we summarize its purpose, usage, and any issues with duplication, legacy, or merit.

| File | Purpose | Used? | Review |
|------|---------|-------|--------|
| `utils/viewModes.ts` | Defines leaderboard view modes and maps them to CSS files | ❌ | Not used anywhere; legacy/unused, can be deleted |
| `utils/timeFilters.ts` | Provides time range types and utility functions for score filtering | ✅ | Used widely in leaderboard, dashboard, and components; no major duplication, but ensure all logic is centralized here |
| `utils/leaderboard.ts` | Utility functions for filtering/sorting/displaying events on leaderboard | ✅ | Used in page, component, and store logic; some logic duplicated in components/stores, should be centralized |
| `utils/eventStatus.ts` | Determines event status (live, archived, etc) for UI | ✅ | Used in event cards and status displays; logic is unique, but could be more DRY if event status logic is repeated elsewhere |
| `types/application/leaderboard.ts` | Types for player scores and leaderboard view props | ✅ | Used in components and type imports; some overlap with `types/leaderboard.ts`, consider consolidation |
| `types/event.ts` | Event and event settings types, includes DB mapping | ✅ | Used throughout leaderboard and event logic; some overlap with `types/leaderboard.ts`, review for DRYness |
| `types/leaderboard.ts` | Types for leaderboard, event settings, and org settings | ✅ | Used in many components and stores; overlaps with `application/leaderboard.ts` and `event.ts`, consider consolidating types |
| `types/score.ts` | Score type from DB | ✅ | Used in leaderboard and event logic; single-purpose, no issues |

### File Details

**`src/lib/utils/viewModes.ts`**
- Defines `ViewMode` enum and `MODE_CSS` mapping for view modes to CSS files.

---

## File-by-File Audit: Leaderboard Components & Routes

This section reviews all leaderboard-related Svelte components and the main leaderboard routes. For each, we summarize its purpose, usage, and any issues with bloat, duplication, legacy, or merit.

| File | Purpose | Used? | Review |
|------|---------|-------|--------|
| `components/EventLeaderboardView.svelte` | Renders event leaderboard UI, processes scores, handles real-time updates | ✅ | Bloated, mixes data/UI logic, much should move to store; legacy props/flags present |
| `components/LeaderboardManager.svelte` | Manages org leaderboard, event rotation, filtering, transitions | ✅ | Monolithic, mixes rotation/data/UI logic; much should move to store; repeated logic |
| `components/TransitionOverlay.svelte` | Animated transition overlay for leaderboard changes | ✅ | Purely presentational, tightly coupled to parent state; no major issues |
| `components/LeaderboardRotationStatus.svelte` | Displays rotation timer/status for leaderboard | ✅ | Presentational, but logic overlaps with rotation store; could be simplified |
| `components/MainLeaderboardCard.svelte` | Card UI for main leaderboard display | ✅ | Used in org leaderboard; mostly presentational, no major issues |
| `components/OrgLeaderboardView.svelte` | Renders organization leaderboard view | ✅ | Used in org leaderboard flows; some logic overlaps with Manager, could be DRYed |
| `components/EventCard.svelte` | Displays event summary in org leaderboard | ✅ | Used in org leaderboard, presentational; no major issues |
| `components/LeaderboardModal.svelte` | Modal for viewing leaderboard details | ✅ | Used in event/scorecard flows; presentational, no major issues |
| `components/LeaderboardController.svelte` | Top-level controller for leaderboard flows | ✅ | Orchestrates state, store, and UI; should be thinned as logic is centralized |
| `components/TimeRangeSelector.svelte` | UI for selecting leaderboard time filter | ✅ | Used in leaderboard and dashboard; presentational, no major issues |
| `components/TimeRangeBadge.svelte` | Badge for displaying time filter label | ✅ | Used in leaderboard UI; presentational, no major issues |
| `/routes/[org]/lb/[shortcode]/+page.svelte` | Event leaderboard page | ✅ | Handles event/organization/leaderboard data loading; contains repeated logic, should delegate to store |
| `/routes/[org]/[code]/+page.svelte` | Event scorecard and leaderboard page | ✅ | Handles event/organization/scorecard logic; contains repeated logic, could be DRYed and thinned |

### Component & Route Details

**`src/lib/components/EventLeaderboardView.svelte`**
- Renders the event leaderboard UI, processes scores, manages real-time updates, and handles QR/ad display.
- **Usage:** Used in event leaderboard and embedded in leaderboard pages.
- **Review:** Bloated; mixes data fetching, processing, and UI. Should move all data/state logic to store and thin component.

**`src/lib/components/LeaderboardManager.svelte`**
- Manages organization leaderboard: event rotation, filtering, transitions, and real-time updates.
- **Usage:** Used in org leaderboard flows.
- **Review:** Monolithic, mixes state/UI/rotation logic. Should be thinned and logic moved to store/utilities.

**`src/lib/components/TransitionOverlay.svelte`**
- Animated overlay for transitions between leaderboard states.
- **Usage:** Used in org leaderboard and transitions.
- **Review:** Purely presentational, tightly coupled to parent state; no major issues.

**`src/lib/components/LeaderboardRotationStatus.svelte`**
- Displays rotation timer and status.
- **Usage:** Used in org leaderboard.
- **Review:** Presentational, but logic overlaps with rotation store; could be simplified.

**`src/lib/components/MainLeaderboardCard.svelte`**
- Card UI for main leaderboard display.
- **Usage:** Used in org leaderboard.
- **Review:** Mostly presentational, no major issues.

**`src/lib/components/OrgLeaderboardView.svelte`**
- Renders organization leaderboard view.
- **Usage:** Used in org leaderboard flows.
- **Review:** Some logic overlaps with Manager; could be DRYed.

**`src/lib/components/EventCard.svelte`**
- Displays event summary in org leaderboard.
- **Usage:** Used in org leaderboard.
- **Review:** Presentational, no major issues.

**`src/lib/components/LeaderboardModal.svelte`**
- Modal for viewing leaderboard details.
- **Usage:** Used in event/scorecard flows.
- **Review:** Presentational, no major issues.

**`src/lib/components/LeaderboardController.svelte`**
- Top-level controller for orchestrating leaderboard state, store, and UI.
- **Usage:** Used in leaderboard flows.
- **Review:** Should be thinned as logic is centralized in stores/utilities.

**`src/lib/components/TimeRangeSelector.svelte`**
- UI for selecting leaderboard time filter.
- **Usage:** Used in leaderboard and dashboard.
- **Review:** Presentational, no major issues.

**`src/lib/components/TimeRangeBadge.svelte`**
- Badge for displaying time filter label.
- **Usage:** Used in leaderboard UI.
- **Review:** Presentational, no major issues.

**`src/routes/[org]/lb/[shortcode]/+page.svelte`**
- Event leaderboard page; loads event, organization, and leaderboard data.
- **Usage:** Main event leaderboard route.
- **Review:** Contains repeated data/state logic; should delegate to store and thin out.

**`src/routes/[org]/[code]/+page.svelte`**
- Event scorecard and leaderboard page; manages event/org/scorecard state.
- **Usage:** Main event scorecard/leaderboard route.
- **Review:** Contains repeated logic; should DRY up and push data/state logic to store.

---

- **Usage:** Not imported or used anywhere in the codebase. Appears to be legacy or abandoned.
- **Review:** Safe to delete unless planned for future use.

**`src/lib/utils/timeFilters.ts`**
- Exports `ScoreTimeRange` type and utility functions for date cutoffs and labels.
- **Usage:** Used in dashboard setup, leaderboard store, and multiple components.
- **Review:** Centralizes time filter logic well; ensure all related logic is routed here for DRYness.

**`src/lib/utils/leaderboard.ts`**
- Provides functions to filter, sort, and select displayable events for the leaderboard.
- **Usage:** Used in leaderboard manager, event leaderboard view, and store logic.
- **Review:** Some logic is duplicated in stores/components; should be the single source for event display logic.

**`src/lib/utils/eventStatus.ts`**
- Defines `EventStatus` type and `getEventStatus` function to determine event state for UI.
- **Usage:** Used in event cards and status indicators.
- **Review:** Logic is unique, but if event status logic is repeated, centralize here.

**`src/lib/types/application/leaderboard.ts`**
- Types for `PlayerScore` and `EventLeaderboardViewProps`.
- **Usage:** Used in event leaderboard view and type imports.
- **Review:** Overlaps with `types/leaderboard.ts`; consider merging for clarity.

**`src/lib/types/event.ts`**
- Types for `Event`, `EventSettings`, and DB mappings.
- **Usage:** Used throughout event and leaderboard logic.
- **Review:** Some overlap with `types/leaderboard.ts`; review for DRYness.

**`src/lib/types/leaderboard.ts`**
- Types for leaderboard, event/org settings, and props.
- **Usage:** Used in components, stores, and props.
- **Review:** Overlaps with `application/leaderboard.ts` and `event.ts`; consolidation recommended.

**`src/lib/types/score.ts`**
- Single type for DB scorecard row.
- **Usage:** Used in leaderboard/event logic.
- **Review:** No issues; single-purpose and clean.

---
