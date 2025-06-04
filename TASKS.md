
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

## 🎨 CSS Loading Fixes for [org]/[code] Route

### 🔍 Issues Identified
- [x] **Security Risk**: Server-side code using PUBLIC_SUPABASE_ANON_KEY instead of service role key
- [x] **CSS Loading**: Dynamic CSS imports via import() not properly injecting stylesheets
- [x] **Redundant Code**: Multiple onMount hooks with similar logic causing confusion
- [x] **No Caching Strategy**: Missing cache-busting for CSS files
- [x] **No Fallback Styling**: Missing fallback if specific CSS fails to load
- [x] **Race Conditions**: Using setTimeout for CSS loading checks

### 🛠️ Implementation Tasks

#### 1. Server-Side Security Fix
- [x] Create a proper server-side Supabase client using service role key
  ```typescript
  // In supabaseClient.ts
  import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
  const supabaseAdmin = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY);
  ```
- [x] Create a utility function to get the appropriate client
  ```typescript
  // In $lib/supabaseClient.ts
  export function getSupabaseClient({ server = false }) {
    return server ? supabaseAdmin : supabase;
  }
  ```

#### 2. CSS Loading Fix
- [x] Create a centralized CSS mapping in a config file
  ```typescript
  // In $lib/utils/viewModes.ts
  export const MODE_CSS = {
    [ViewMode.SCORECARD]: 'scorecard.css',
    [ViewMode.EVENT_LEADERBOARD]: 'leaderboard.css',
    [ViewMode.ORG_LEADERBOARD]: 'leaderboard.css',
  };
  ```
- [x] Implement proper dynamic CSS loading in +page.svelte
  ```typescript
  // Replace dynamic import with proper link element creation
  if (browser && data?.cssFile) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `/src/lib/styles/${data.cssFile}?v=${APP_VERSION}`; // Add version for cache busting
    document.head.appendChild(link);
  }
  ```

#### 3. Code Cleanup
- [x] Consolidate onMount hooks into a single function
- [x] Remove redundant CSS debugging code in production
- [x] Add proper error handling for CSS loading failures

#### 4. Fallback Styling
- [x] Ensure base.css and theme.css contain essential styles for all views
- [x] Add fallback styling if specific CSS fails to load

#### 5. Performance Improvements
- [x] Add proper caching headers for CSS files
- [x] Implement version-based cache busting
- [x] Replace setTimeout with proper event listeners for CSS loading

#### 6. Defensive Programming
- [ ] Add validation for org_leaderboard_codes structure
- [ ] Implement proper error handling for malformed JSON data
- [ ] Add query limits for org-level leaderboard data fetching

## 🔄 Simplified Routing Structure

### Current Structure
- `[org]/[code]` - Handles multiple view modes (scorecard, event leaderboard, org leaderboard)
- Complex code in +page.server.ts to determine which view to show
- CSS loading issues due to multiple view types in one route

### New Structure
- `[org]/[shortcode+access_token]` - Scorecard view only
- `[org]/lb/[shortcode]/` - Leaderboard view only

### Implementation Tasks
- [ ] Create new route structure for leaderboards at `[org]/lb/[shortcode]/`
- [ ] Simplify existing `[org]/[code]` route to handle only scorecard views
- [ ] Update QR code generation to use the new URL patterns
- [ ] Update any links or redirects throughout the app
- [ ] Ensure proper CSS loading for each dedicated route
