# 🏌️ Mini-Golf Leaderboard - Project Tasks

## 🏆 Shared Leaderboard Implementation Plan

### 1. 🔧 Architecture Overview
```
[Org Leaderboard Page] (/[org]/leaderboard)
        ↓
[Leaderboard Manager] – Rotation + State
        ↓
[Event Leaderboard View] – Per-event renderer
        ↓
[Shared Utilities] – Filtering, sorting, score counts
```

### 2. 🧩 Key Components
- [ ] **Org Leaderboard Page** (`/[org]/leaderboard`)
  - [ ] Page shell that pulls org ID from slug
  - [ ] Renders LeaderboardManager
  - [ ] Handles loading and fallback states

- [ ] **LeaderboardManager** (New Component)
  - [ ] Loads events + score counts
  - [ ] Uses `getDisplayableEvents()` to filter
  - [ ] Handles:
    - [ ] Rotation timing
    - [ ] Current event index
    - [ ] Subscribing to realtime updates
    - [ ] Optional manual controls

- [ ] **EventLeaderboardView**
  - [ ] Renders a single event's leaderboard
  - [ ] Reuses existing Leaderboard.svelte logic
  - [ ] Handles cases like "no scores yet", "loading", or "errored"

- [ ] **Utilities**
  - [x] `utils/leaderboard.ts` — already built
  - [ ] `types.ts` — defines shared types like LeaderboardState, ScoreCounts

### 3. 🔄 Data Flow

- [ ] **Initial Load**
  1. [ ] Fetch all events for organization_id
  2. [ ] Fetch score counts per event
  3. [ ] Apply `getDisplayableEvents()` → gives rotation list

- [ ] **Realtime Updates**
  - [ ] Supabase subscription on scorecard
  - [ ] On insert/update:
    - [ ] Bump the scoreCounts map
    - [ ] Re-run `getDisplayableEvents()`
    - [ ] Update rotation if list changes

- [ ] **Rotation**
  - [ ] Auto-advance every rotationInterval
  - [ ] Skip events with `scoreCounts[id] === 0`
  - [ ] Loop back to start when complete
  - [ ] Optional features:
    - [ ] Manual "next" and "back"
    - [ ] "Pause rotation" toggle

### 4. 🛠 Implementation Plan

#### ✅ Phase 1: Scaffold
- [ ] Create `/[org]/leaderboard` route
- [ ] Add `<LeaderboardManager />` as main component
- [ ] Display fallback when no displayable events

#### 🚀 Phase 2: Fetching Logic
- [ ] Fetch org-scoped events
- [ ] Fetch score counts per event (efficient SELECT head count)
- [ ] Filter + sort using `getDisplayableEvents()`

#### 🔁 Phase 3: Rotation Engine
- [ ] Track currentIndex, rotationInterval, and timer
- [ ] Crossfade between EventLeaderboardView
- [ ] Clean up interval on unmount

#### 🌩 Phase 4: Supabase Realtime
- [ ] Subscribe to scorecard inserts
- [ ] Update scoreCounts on insert
- [ ] Trigger `getDisplayableEvents()` again on change

#### 🎨 Phase 5: UI Polish
- [ ] Add animation between transitions
- [ ] Responsive for vertical and horizontal layouts
- [ ] Show "Nothing Live Right Now" if filtered list is empty

### 5. 🧠 Technical Considerations
- [ ] **Performance**: Only mount 1 leaderboard at a time
- [ ] **Offline Support**: Cache last loaded state via localStorage
- [ ] **Accessibility**: Announce active leaderboard with ARIA or visually hidden labels
- [ ] **Error Handling**: Gracefully degrade on fetch errors or no Supabase

### 6. 🗃 Queries You'll Need
- [ ] **Get all events for org**
  ```sql
  SELECT * FROM events WHERE organization_id = $orgId
  ```

- [ ] **Get score counts per event**
  ```sql
  SELECT event_id, COUNT(*) 
  FROM scorecard 
  WHERE event_id IN (...) 
  GROUP BY event_id
  ```

- [ ] **Realtime subscription**
  ```typescript
  const subscription = supabase
    .channel('scorecard-changes')
    .on('postgres_changes', 
      { 
        event: 'INSERT',
        schema: 'public',
        table: 'scorecard'
      },
      (payload) => {
        // Handle new score
      }
    )
    .subscribe();
  ```

### 7. 🧠 State Model
- [ ] **Define TypeScript Interface**
  ```typescript
  interface LeaderboardState {
    events: Event[];
    currentEventIndex: number;
    scoreCounts: Record<string, number>;
    displayableEvents: Event[];
    loading: boolean;
    error: string | null;
    rotationInterval: number;
    rotationPaused: boolean;
  }
  ```

### 8. ✅ Next Steps
1. [ ] Create `/src/routes/[org]/leaderboard/+page.svelte`
2. [ ] Implement `LeaderboardManager.svelte`
3. [ ] Set up realtime subscriptions
4. [ ] Add rotation controls and animations

## 🧱 EventLeaderboardView Component Refactor

### 🎯 Purpose
Refactor the leaderboard into a reusable component that can be used in both single-event and rotating leaderboard contexts.

### ✅ Goals
- [ ] Decouple leaderboard rendering from routing and data fetching
- [ ] Create a reusable `<EventLeaderboardView />` component
- [ ] Support both single-event and multi-event rotation modes
- [ ] Eliminate style/behavior duplication
- [ ] Improve testability and maintainability

### 🧩 Component API
```typescript
<script lang="ts">
  export let event: Event;
  export let organizationSettings: OrgSettings;
  export let leaderboard: PlayerScore[];
  export let qrCodeUrl?: string;
  export let showQr?: boolean = true;
  export let showAds?: boolean = true;
</script>
```

### 📐 Responsibilities
- [ ] Display logos, event title, leaderboard table, ad panel, and QR code
- [ ] Render player rankings (Top 10)
- [ ] Apply dynamic theming via `--accent-color`
- [ ] Handle missing data gracefully
- [ ] Support optional hiding of QR/ad panels

### 🏗 Implementation Plan
1. [ ] Create `src/lib/components/EventLeaderboardView.svelte`
   - [ ] Move layout and display logic from current page
   - [ ] Replace variables with props
   - [ ] Add TypeScript interfaces
   - [ ] Document props and usage
   - [ ] Implement color transition system using CSS variables
   - [ ] Add transition event emitters

2. [ ] Update `/[org]/[event]/leaderboard/+page.svelte`
   - [ ] Extract data fetching logic
   - [ ] Use new `<EventLeaderboardView />` component
   - [ ] Handle loading/error states

3. [ ] Update `/[org]/leaderboard/+page.svelte`
   - [ ] Use `<EventLeaderboardView />` for each event
   - [ ] Implement two-phase transition system:
     - [ ] Phase 1: Fade out content (300ms)
     - [ ] Phase 2: Update color + fade in (500ms)
   - [ ] Add rotation controls with debouncing
   - [ ] Handle transition state management

### 🎨 Animation Architecture
- [ ] **CSS Transitions**
  - [ ] Global accent color transitions (500ms)
  - [ ] Content fade in/out (300ms)
  - [ ] Optimize with `will-change`
- [ ] **State Management**
  - [ ] Track transition states
  - [ ] Debounce rapid rotations
  - [ ] Handle interrupted transitions

### 🔍 Testing
- [ ] Test with various event configurations
- [ ] Verify theming transitions smoothly
- [ ] Test rapid rotation handling
- [ ] Verify responsive behavior
- [ ] Test transition interruptions

### 🔮 Future Extensions
- [ ] Add animation transitions
- [ ] Compact mode for small screens
- [ ] Split-screen layout support
- [ ] Customizable color schemes

------------

# 🏌️ Mini-Golf Leaderboard - Project Tasks



- [ ] **Billing Portal & Subscription Management**
  - [ ] Create customer portal for subscription management
  - [ ] Display current plan and trial status
  - [ ] Add payment method functionality
  - [ ] Handle subscription lifecycle (trial end, cancellation, renewal)
  - [ ] Send trial end notifications

- [ ] **Webhook Handlers**
  - [ ] Handle `customer.subscription.updated` for trial end
  - [ ] Handle `invoice.payment_succeeded` for successful payments
  - [ ] Handle `invoice.payment_failed` for payment issues
  - [ ] Update organization status based on subscription state

- [ ] **Billing Settings Page**
  - [ ] Display current subscription status
  - [ ] Show next billing date and amount
  - [ ] Add upgrade/downgrade options
  - [ ] Display billing history
  - [ ] Add payment method management

#### 1. Account Creation & Authentication
- [x] **Signup Flow**:
  - User signs up with email
  - Receives magic link
  - Automatically starts 14-day trial
  - Trial status managed by Stripe Checkout
 Notify user and update status

#### 6. Post-Trial Experience
- [ ] **Frontend**: Post-Trial UI
  - [ ] Show upgrade prompt if trial expires without subscription
  - [ ] Restrict access to premium features if needed
  - [ ] Display current subscription status in user settings

### Backend Implementation
- [ ] Implement subscription service with methods for:
  - Creating a customer
  - Starting a trial
  - Creating a subscription
  - Updating payment method
  - Canceling subscription
  - Handling webhook events
  - Checking trial status
  - Calculating days remaining in trial

### Access Control & Edge Cases
- [ ] **Authentication States**:
  - [ ] Handle users with expired sessions
  - [ ] Handle multiple tabs with different auth states

- [ ] **Subscription States**:
  - [ ] Handle trial expiration
  - [ ] Handle payment failures after trial
  - [ ] Handle canceled subscriptions
  - [ ] Handle past due subscriptions
  - [ ] Handle users who cancel and resubscribe
  - [ ] Handle users who upgrade/downgrade plans

- [ ] **Payment Flow**:
  - [ ] Handle Stripe Checkout session expiration
  - [ ] Handle abandoned checkouts
  - [ ] Handle failed payments
  - [ ] Handle chargebacks
  - [ ] Handle refunds

- [ ] **Technical Edge Cases**:
  - [ ] Handle webhook delivery failures
  - [ ] Handle race conditions in subscription updates
  - [ ] Handle network failures during critical operations
  - [ ] Handle duplicate webhook events

- [ ] **User Experience**:
  - [ ] Show loading states during async operations
  - [ ] Provide clear error messages
  - [ ] Allow users to retry failed operations
  - [ ] Show subscription status clearly in UI
  - [ ] Send email notifications for important subscription events

### Testing
- [ ] Test subscription flow with test cards
- [ ] Test trial expiration
- [ ] Test failed payment handling
- [ ] Test webhook delivery

### Documentation
- [ ] Add billing section to README
- [ ] Document environment variables
- [ ] Add Stripe webhook setup instructions

### 🔒 Row Level Security (RLS) Setup
- [ ] **Events Table**
  - [ ] Enable RLS on events table
  - [ ] Create policy for organization members to view events
  - [ ] Create policy for organization admins to manage events
  - [ ] Add test cases for RLS policies
  - [ ] Document RLS policies in supabase-tables.md

- [ ] **Organizations Table**
  - [ ] Enable RLS on organizations table
  - [ ] Create policy for organization owners to manage their organization
  - [ ] Create policy for organization members to view organization details
  - [ ] Add test cases for RLS policies
  - [ ] Document RLS policies in supabase-tables.md

### 🧹 3. MVP Polish
- [ ] **CSS Cleanup & Consistency**
  - [ ] Fix button overflow issues in scorecard
    - Add proper width constraints and box-sizing
    - Ensure buttons respect container padding
  - [ ] Center numbers in score selector
    - Adjust flex/grid alignment
    - Ensure proper vertical centering
  - [ ] Standardize accent color usage
    - Replace hardcoded colors with CSS variables
    - Ensure consistent hover/focus states
    [ ] Add a sign out on Org settings

- [ ] Skeleton loaders for:
  - Events dashboard
  - Scorecard
  - Leaderboard
- [ ] Add polished date picker (icon, clear button)
- [ ] Input validation + trimming (e.g., title, slug)
- [ ] Show save feedback (toast or inline "Saved ✅")
- [ ] Add loading spinner to all Save buttons

### ✉️ 5. Auth Email + Provider Setup
- [ ] Customize Supabase email templates (branding, tone)
- [ ] Integrate email provider (Resend, Postmark, Mailgun)
- [ ] Add "Resend magic link" on login screen
- [ ] Set up verified sender + reply-to

### 🔐 5. Auth + Route Protection
- [ ] Add guard to all `/dashboard/*` routes
- [ ] Only allow users to view/edit events tied to their org
- [ ] Fallback if org or event doesn't exist

### 🧪 6. Pre-Launch Checklist
- [ ] Mobile testing for scorecard, leaderboard, admin
- [ ] 404 page for bad slugs or event not found
- [ ] SEO meta tags on public leaderboard pages
- [ ] Add Meta Pixel + Google Analytics if needed
- [ ] Set up custom domain in Vercel (ldrboard.co, score.clubgreen.au, etc.)

## 📁 Relevant Files

### Core Components
- `src/routes/dashboard/events/[slug]/+page.svelte` - Main event edit page
- `src/routes/[org]/[event]/leaderboard/+page.svelte` - Leaderboard display
- `src/routes/[org]/[event]/scorecard/+page.svelte` - Scorecard interface
- `src/lib/styles/leaderboard.css` - Leaderboard styles
- `src/lib/styles/dashboard.css` - Dashboard styles


### Technical Stack
- **Frontend**: Svelte/SvelteKit
- **Backend**: Supabase
- **Hosting**: Vercel
- **Version Control**: GitHub

### Database Schema
- **Events Table**: Stores event details and settings
- **Scorecard Table**: Manages player scores and game data
- **Leaderboard Settings**: Controls display preferences and theming

### Deployment
1. Set up Vercel project
2. Configure environment variables
3. Set up custom domain
4. Enable CI/CD from GitHub

### Testing Strategy
- Component tests for UI elements
- End-to-end tests for critical user flows
- Cross-browser and device testing