# 🏁 ClubGreen Leaderboard Rebuild – Architecture

### ✅ Purpose

A fully modular, maintainable, and display-optimized leaderboard system designed for **24/7 unattended rotation** across **live event leaderboards and time filters**. It runs on public displays (e.g. venue TVs) and never assumes interactivity.

---

## 🧠 Core System Architecture

### Data Flow
```
Supabase → scoresSource → leaderboardViewStore → UI Components
```

### Key Files & Their Roles

1. **Stores**
   - `rotationStore.ts`: Manages which board is shown and when to rotate
     - Holds list of boards (event + time filter combinations)
     - Handles rotation timing and countdown
     - Exposes current board and progress
   
   - `leaderboardViewStore.ts`: Manages data for each board
     - Loads and caches scores for each board
     - Handles loading states and errors
     - Subscribes to rotation changes to load new data

2. **Utilities**
   - `scoreCalculator.ts`: Core scoring logic
     - Aggregates hole-by-hole scores
     - Handles time filter calculations
     - Sorts and ranks players
   
   - `timeFiltersUtils.ts`: Time window management
     - Converts time filters to actual cutoffs
     - Handles "today", "this week", etc.
     - Provides human-readable labels

3. **Components**
   - `LeaderboardLayout.svelte`: Main shell
     - Handles overall layout
     - Manages loading/error states
     - Coordinates transitions
   
   - `LeaderboardHeader.svelte`: Top section
     - Shows event/org logos
     - Displays current time filter
     - Handles loading states
   
   - `LeaderboardScores.svelte`: Score display
     - Shows top 10 players
     - Handles dual/single column layout
     - Displays hole-in-ones
   
   - `LeaderboardSidebar.svelte`: Right section
     - Shows QR code for scorecard
     - Displays event/org ads
     - Handles responsive hiding
   
   - `TransitionOverlay.svelte`: Smooth transitions
     - Fades between boards
     - Shows loading spinner
     - Prevents flicker
   
   - `RotationStatus.svelte`: Bottom indicator
     - Shows current board
     - Displays countdown
     - Lists all boards in rotation

---

## 🎯 Page Implementation

### `/ob/[code]` (Organization View)
1. **Server Load**
   ```ts
   // +page.server.ts
   export async function load({ params }) {
     const org = await getOrganizationByCode(params.code);
     const events = await getLiveEvents(org.id);
     const boards = events.flatMap(event => 
       event.time_filters.map(timeFilter => ({
         eventId: event.id,
         timeFilter
       }))
     );
     return { org, boards };
   }
   ```

2. **Client Setup**
   ```ts
   // +page.svelte
   $: if (data.org && data.boards) {
     rotationStore.initialize(
       data.boards, 
       data.org.leaderboard_rotation_interval * 1000
     );
   }
   ```

### `/lb/[shortcode]` (Single Event View)
1. **Server Load**
   ```ts
   // +page.server.ts
   export async function load({ params }) {
     const event = await getEventByShortCode(params.shortcode);
     const boards = event.time_filters.map(timeFilter => ({
       eventId: event.id,
       timeFilter
     }));
     return { event, boards };
   }
   ```

2. **Client Setup**
   ```ts
   // +page.svelte
   $: if (data.event && data.boards) {
     rotationStore.initialize(data.boards, 15000); // 15s rotation
   }
   ```

---

## 🎨 Theming System

- Event-specific colors via CSS variables
- Auto-generated color scales (100-900)
- Semantic color usage in components
- No hardcoded colors

---

## 🧱 Remaining Tasks

1. **Page Components**
   - Create `/ob/[code]/+page.svelte`
   - Create `/lb/[shortcode]/+page.svelte`
   - Add error boundaries
   - Implement loading states

2. **Data Integration**
   - Set up Supabase real-time subscriptions
   - Implement score aggregation
   - Add time filter calculations

3. **Optional Features**
   - Watchdog auto-reload for 24/7 uptime
   - Analytics tracking
   - Component tests
   - Transition coordination hook

