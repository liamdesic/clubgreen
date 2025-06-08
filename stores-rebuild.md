# Stores Rebuild Plan: Table-Aligned, Canonical, and DRY

## Why Align Stores to Supabase Tables?

If you want a codebase that is:
- **Predictable** (no hidden state, no duplication)
- **Easy to reason about** (one source of truth per data type)
- **DRY and maintainable** (no repeated business logic)
- **Flexible for future features** (easy to add derived data, new views, or sync with DB)

...then aligning your Svelte stores directly to your Supabase tables is the best foundation you can build.

---

## The Problem With "UI Area" or "Feature Overlap" Stores

**Before:**
- You might have a `LeaderboardStore`, a `ScorecardStore`, a `SettingsStore`, and a `PlayerStore`—all holding overlapping or duplicated data.
- Settings for events, organizations, and leaderboards might be split across multiple places, risking drift and confusion.
- Components might subscribe to several stores, each with their own version of the "truth."

**Symptoms:**
- You fix a bug in one store, but another part of the app still has stale state.
- You have to write (and test!) the same logic in multiple places.
- Adding a new feature means updating several stores and hoping they stay in sync.

---

## The Table-Aligned Store Approach (Proposed)

**After:**
- Each store maps 1:1 to a core Supabase table: `organizations`, `events`, `scorecard`.
- Each store is responsible for fetching, holding, and updating *all* rows for its table.
- Settings (JSON columns or promoted columns) are always exposed by the store that owns the data.
- All business logic (grouping, aggregating, filtering, ranking) is handled by pure utils or derived stores—never duplicated.
- Components/pages subscribe to stores and derived stores for exactly the data they need.

---

## The Proposed Stores

### 1. **OrgStore** (organizations)
- **Holds:** All organization rows, org-wide settings, billing/branding info.
- **Exposes:**
  - `orgs`: All orgs (if multi-tenant) or current org
  - `orgSettings`: Canonical org settings (from promoted columns or settings_json)
  - Methods: `fetchOrgs`, `updateOrg`, `setOrgSettings`, etc.

### 2. **EventStore** (events)
- **Holds:** All event rows for the org, event-specific settings
- **Exposes:**
  - `events`: All events
  - `eventSettings`: Canonical event settings (from promoted columns or settings_json)
  - Methods: `fetchEvents`, `addEvent`, `updateEvent`, etc.

### 3. **ScoresStore** (scorecard)
- **Holds:** All scorecard rows
- **Exposes:**
  - `scorecards`: All score entries
  - Derived: `scoresByGame`, `scoresByPlayer`, `scoresByEvent` (using utils)
  - Methods: `fetchScores`, `addScore`, `updateScore`, etc.

---

## How Do Utils Fit In?
- **Utils** are pure functions that take store data and return new data: e.g.,
  - `groupScoresByPlayer(scorecards)`
  - `calculateLeaderboard(scores, settings)`
  - `getEventStatus(event, now)`
- **Stores never duplicate this logic—they just call the util and expose the result as a derived store.**

---

## Example: Scorecard → Leaderboard Flow

1. **ScoresStore** fetches all scorecard rows from Supabase and exposes them as `scorecards`.
2. **A util** (`groupScoresByPlayer`) groups these by player.
3. **LeaderboardStore** (or a derived store) uses `calculateLeaderboard(groupedScores, eventSettings)` to produce the leaderboard array.
4. **Component** subscribes to the leaderboard store/derived store and renders the UI.

```ts
// scoresStore.ts
export const scorecards = writable<Scorecard[]>([]);
export const scoresByPlayer = derived(scorecards, $cards => groupScoresByPlayer($cards));

// utils/leaderboard.ts
export function calculateLeaderboard(scoresByPlayer, settings) { /* ... */ }

// leaderboardStore.ts (or just a derived store)
import { scoresByPlayer } from './scoresStore';
import { eventSettings } from './eventStore';
export const leaderboard = derived([scoresByPlayer, eventSettings], ([$scores, $settings]) =>
  calculateLeaderboard($scores, $settings)
);

// Leaderboard.svelte
$: $leaderboard // subscribe and render
```

---

## Why This Approach Wins

- **Single Source of Truth:** Every piece of data is stored in exactly one place.
- **No Drift:** Settings or data changes are instantly reflected everywhere they're used.
- **Easy to Debug:** You always know where to look for the data/state you need.
- **Composable:** Need a new view or aggregation? Just write a new util or derived store—no risk of breaking core state.
- **Scalable:** As your app grows, this structure remains clear and maintainable.

---

## Before & After Example

**Before:**
- `LeaderboardStore` and `ScorecardStore` both fetch and hold score data, but with slightly different logic.
- `SettingsStore` tries to manage both org and event settings, but sometimes they get out of sync.

**After:**
- `ScoresStore` holds all score data—everyone else just consumes it.
- `EventStore` and `OrgStore` each own their settings—no confusion, no duplication.
- Leaderboard, stats, and status are all derived using pure utils.

---

## FAQ

**Q: What if a setting affects multiple areas (e.g., both scorecard and leaderboard)?**
- A: It lives in the store that owns the data (usually `eventStore` or `orgStore`). Any part of the app that needs it just subscribes.

**Q: What if I need a cross-table view (e.g., leaderboards by org)?**
- A: Use a derived store or util that combines data from multiple stores—never duplicate the data itself.

**Q: What about UI state (loading, modals, theme)?**
- A: UI state can have its own small stores, but should never mix with core data stores.

---

## Conclusion

**Aligning stores with your Supabase tables is the most robust, DRY, and future-proof way to manage state in your SvelteKit app.**
- It keeps your data model clear and maintainable.
- It prevents bugs and duplication.
- It’s easy for new devs to onboard and reason about.

**If you want to move fast and build features with confidence, this is the foundation you want.**
