# 🏁 ClubGreen Leaderboard Rebuild – Final Architecture Summary

### ✅ Purpose

A fully modular, maintainable, and display-optimized leaderboard system designed for **24/7 unattended rotation** across **live event leaderboards and time filters**. It runs on public displays (e.g. venue TVs) and never assumes interactivity.

---

## 🧠 Core Data Flow

### 🔼 Upstream (Server + Setup Logic)

1. **Server loads org + event data**
   From `/ob/[code]/+page.server.ts`:

   * Organization with `leaderboard_rotation_interval`
   * All **live events** (using `getEventStatus(event) === 'live'`)

2. **Time filters per event**
   Using `getActiveTimeFiltersForEvent(event)`
   → returns enabled filters like `'today'`, `'this_week'`, etc.

3. **Board generation**
   A flat list of boards:

   ```ts
   type Board = { eventId: string; timeFilter: TimeFilter };
   ```

   Built by combining each live event with its time filters.

4. **Rotation setup**
   The `rotationStore` is initialized like so:

   ```ts
   rotationStore.initialize(boards, org.leaderboard_rotation_interval * 1000);
   ```

---

## 🔁 Rotation Logic (`rotationStore`)

* Holds the list of `boards[]` and manages internal rotation via `setInterval`
* Exposes only:

  * `currentBoard` (eventId + timeFilter)
  * `initialize()` method
* Runs completely **headless** — no pause, controls, or interaction logic

---

## 🧩 UI Component Structure

### `/ob/[code]` – Org Display Page

* **Uses `rotationStore.currentBoard`** to determine which leaderboard is shown
* Reacts to `currentBoard` changes by:

  * Fetching scores
  * Re-rendering display
  * Triggering `<TransitionOverlay>` animation

### Key Components:

| Component                   | Purpose                                     |
| --------------------------- | ------------------------------------------- |
| `LeaderboardLayout`         | Main shell: header + scores + sidebar       |
| `LeaderboardHeader`         | Event/org info + time filter                |
| `LeaderboardScores`         | Responsive layout, dual/single column       |
| `LeaderboardSidebar`        | QR code (scorecard), ad from event settings |
| `TransitionOverlay`         | Smooth crossfade between boards             |
| `LeaderboardRotationStatus` | Shows active event + sub-filter highlights  |

---

## 🎯 Behavior Summary

* ⚫ **Black screen on load** → no flicker
* ⏳ All data is preloaded before first render
* 🎬 `TransitionOverlay` is shown:

  * After loading
  * Between each board
* 🔁 Boards auto-rotate at org-configured interval (e.g. every 15s)
* 👀 `LeaderboardRotationStatus`:

  * Shows the current event
  * Shows time filters as sub-pills (active: 100% opacity, others: 40%)

---

## 🧩 Component: `EventLeaderboardView`

### Purpose
Displays a single event's leaderboard with support for rotation between time filters, showing top 10 players with their scores and hole-in-ones.

### Data Requirements

#### Player Data
- `player.name: string` - Player's display name
- `player.totalScore: number` - Player's total score (lower is better in golf)
- `player.hole_in_ones: number` - Count of hole-in-ones
- `player.id: string` - Unique player identifier

#### Event Settings
- `event.logo_url: string | null` - URL to event logo
- `event.title: string` - Event title
- `event.time_filters: TimeFilter[]` - Available time filters for the event
- `event.accent_color: string | null` - Primary color for theming (format: #RRGGBB)
- `event.ads_image_url: string | null` - Event-specific ad banner URL
- `event.ads_text: string | null` - Ad caption text
- `event.ads_url: string | null` - Ad click-through URL
- `event.hole_count: number | null` - Number of holes in the event
- `event.show_on_main_leaderboard: boolean | null` - Whether to show on main leaderboard

#### Organization Settings
- `organization.logo_url: string | null` - Fallback organization logo
- `organization.ads_image_url: string | null` - Fallback ad banner URL
- `organization.leaderboard_rotation_interval: string` - Rotation interval (e.g., '10s')
- `organization.settings: OrganizationSettings` - Additional organization settings (deprecated)

#### UI State
- `loading: boolean` - Data loading state
- `error: string | null` - Error message if any
- `leaderboard: Player[]` - Sorted array of player data
- `currentEvent: string` - Fallback event title
- `qrCodeDataUrl: string | null` - Generated QR code image URL

### Props

#### Required
- `organization: Organization` - Organization data object
- `event: Event` - Event data object containing `eventSettings`
- `scorecard: any[]` - Legacy scorecard data (deprecated)

#### Optional
- `org: string` - Organization slug (alternative to organization.slug)
- `organizationSettings: OrganizationSettings` - Fallback organization settings
- `preloadedLeaderboard: PlayerScore[]` - Pre-loaded leaderboard data

#### Feature Flags
- `showQr: boolean` - Toggle QR code visibility (default: `true`)
- `showAds: boolean` - Toggle ad banner visibility (default: `true`)
- `hydrateFromSupabase: boolean` - Enable Supabase hydration (default: `false`)
- `realtimeUpdates: boolean` - Enable real-time score updates (default: `true`)
- `showLoadingIndicator: boolean` - Show loading state (default: `true`)
- `showErrorMessages: boolean` - Show error messages (default: `true`)

### Methods
- `loadData(): void` - Retry loading data on error
- `getTimeRangeLabel(filter: string): string` - Formats time range for display


## ✅ Outcomes

* **Single source of truth**: All types & logic from THE-BRAIN
* **Zero duplication**: Store is logic-only; display is reactive
* **Future-proof**: New components can be dropped in easily
* **Resilient**: Auto-reset, no input required, optimized for real-world venues

---

## 🎯 Single Event Leaderboard View (`/lb/[shortcode]`)

### Purpose
A self-contained, rotating leaderboard for a single event, matching the organization view's behavior but filtered to one event.

### Key Characteristics
- **Auto-Rotating**: Cycles through the event's time filters automatically
- **No Status Checks**: Shows the event regardless of live/active status
- **URL Structure**: `/lb/[short_code]` (e.g., `/lb/4XY6XG`)
- **Same Behavior as Org View**: Uses the same `rotationStore` and components

### Data Flow
1. **Server Loads Event**
   ```typescript
   // +page.server.ts
   export async function load({ params }) {
     const event = await getEventByShortCode(params.short_code);
     return { event };
   }
   ```

2. **Client-Side Setup**
   ```typescript
   // +page.svelte
   $: if (data.event) {
     const boards = data.event.time_filters.map(timeFilter => ({
       eventId: data.event.id,
       timeFilter
     }));
     rotationStore.initialize(boards, 15000); // 15s rotation
   }
   ```

## 🎨 Theming System

### Core Principles
- **Dynamic Theming**: Event-specific colors cascade through CSS variables
- **Consistent Variables**: Uses the global theme system defined in `theme.css`
- **Automatic Variations**: Color variants (100-900) are generated from the base accent color

### Key Variables
- **Base Accent**: `--accent-color` (set per event)
- **Color Scale**: Auto-generated variants (100-900) for consistent theming
- **Gradients**: Pre-defined gradients using the accent color system
- **Text Colors**: Automatic contrast for readability

### Implementation Notes
- Event pages set the root `--accent-color`
- Components use semantic color variables (e.g., `var(--accent-color-500)`)
- No hardcoded colors in components - all reference theme variables

## 🧱 What's Left?

Only if desired (not critical for MVP):

| Feature                      | Needed?  | Notes                              |
| ---------------------------- | -------- | ---------------------------------- |
| Watchdog auto-reload         | Optional | For 24/7 live uptime               |
| Analytics/events tracking    | Optional | If usage metrics are needed        |
| Component tests              | Optional | Defer until features stabilize     |
| Admin control UI (dev-only)  | ❌ No     | Explicitly not supported           |
| Transition coordination hook | Optional | If you want to debounce re-renders |

