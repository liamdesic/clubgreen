. Types
What: Canonical TypeScript types (models.ts) that match your DB schema and app needs.
Why: They are the “contract” for all data, ensuring type safety and clarity everywhere.
2. Stores (Source Stores)
What: Table-aligned, session-scoped Svelte stores (e.g., scoresSource, eventSource, orgSource).
Why: Hold and sync the actual data you care about, fetched from Supabase, with real-time updates if needed.
3. Utils
What: Pure, stateless functions for grouping, aggregating, sorting, formatting, and calculating.
Why: Keep business logic DRY, testable, and reusable across stores, views, and components.
4. View Stores (Feature/Derived Stores)
What: Svelte stores (often derived) that combine, transform, or aggregate data from one or more source stores, tailored for a specific page or feature (e.g., liveLeaderboardStore, rotatingOrgLeaderboardStore).
Why: Present data in exactly the shape needed for the UI, without polluting the raw data stores.
5. Components
What: Svelte components that render UI, subscribe to view stores, and use utils for formatting or business logic.
Why: Keep UI logic clean, declarative, and reactive—no data fetching or business logic here.
6. Pages (+page.svelte / +page.ts)
What: Route-level SvelteKit files that compose components, wire up stores, and handle page-level logic (e.g., routing, layout).
Why: Serve as the entry point for each user-facing screen.
Visual Flow
CopyInsert
Types (models.ts)
      ↓
Source Stores (table-aligned, e.g., scoresSource)
      ↓
Utils (pure functions for grouping, ranking, etc.)
      ↓
View Stores (feature/derived, e.g., liveLeaderboardStore)
      ↓
Components (UI, subscribe to view stores)
      ↓
+page.svelte (+page.ts) (route logic, layout, composition)
Why This Order?
Each layer builds on the guarantees and structure of the previous one.
Types are the foundation for everything.
Source stores are the single source of truth for data.
Utils keep logic DRY and reusable.
View stores shape data for the UI, without duplicating or mutating the source.
Components and pages focus only on presentation and composition, not data management.
This approach gives you:

Maximum clarity and maintainability.
Zero duplication or data drift.
Easy onboarding for new devs.
A clean path for scaling up features and complexity.
If you’d like, I can help scaffold this structure for your repo, or walk through a real example for one feature!

# Dashboard Refactor Tasks

## Phase 1: Project Setup and Structure ✅
- [x] Create new dashboard route at `/dashboard-new`
- [x] Set up basic layout and navigation
- [x] Implement responsive design
- [x] Add loading states and error handling
- [x] Set up TypeScript types and interfaces

## Phase 2: Organization Management ✅
- [x] Create organization store
- [x] Implement organization selection
- [x] Add organization settings
- [x] Handle organization switching
- [x] Add organization creation/editing

## Phase 3: Event Management (In Progress) 🔄
- [x] Create event store with reactive state management
- [x] Implement event creation modal
- [x] Add event card component with management features
- [x] Create event sections for different event states
- [x] Add event archiving and deletion
- [x] Implement QR code generation
- [ ] Add event filtering and sorting
- [ ] Implement event search
- [ ] Add event statistics and analytics
- [ ] Create event templates

## Phase 4: Score Management (Next Up)
- [ ] Create score store
- [ ] Implement score entry form
- [ ] Add score validation
- [ ] Create score list view
- [ ] Add score statistics
- [ ] Implement score export
- [ ] Add score history

## Phase 5: User Management
- [ ] Create user store
- [ ] Implement user roles
- [ ] Add user permissions
- [ ] Create user profile
- [ ] Add user settings
- [ ] Implement user activity log

## Phase 6: Analytics and Reporting
- [ ] Create analytics dashboard
- [ ] Implement event statistics
- [ ] Add organization statistics
- [ ] Create custom reports
- [ ] Add data export
- [ ] Implement data visualization

## Phase 7: Testing and Optimization
- [ ] Write unit tests
- [ ] Add integration tests
- [ ] Implement performance optimization
- [ ] Add error tracking
- [ ] Create documentation
- [ ] Perform security audit

## Phase 8: Deployment and Launch
- [ ] Set up production environment
- [ ] Configure CI/CD pipeline
- [ ] Perform load testing
- [ ] Create backup strategy
- [ ] Plan launch strategy
- [ ] Monitor and maintain

## Current Focus
We are currently working on Phase 3: Event Management. The following components have been created and implemented:
- Event store with reactive state management
- Event card component with management features
- Event sections for different event states
- Event management actions (edit, archive, delete)
- QR code generation for events

Next steps in Phase 3:
1. Implement event filtering and sorting
2. Add event search functionality
3. Create event statistics and analytics
4. Implement event templates

## Notes
- All components are being built with TypeScript for type safety
- Using SvelteKit for routing and server-side functionality
- Implementing reactive state management with Svelte stores
- Following modern UI/UX best practices
- Ensuring mobile responsiveness
- Maintaining consistent error handling and loading states

### 📊 Dashboard Refactor (dashboard-new)
#### Phase 1: Foundation
- [x] Create dashboard-new route structure
  - [x] +page.svelte (Main container)
  - [x] +page.server.ts (Server-side data loading)
  - [x] +layout.svelte (If needed)
- [x] Set up core stores
  - [x] eventStore.ts (Event state management)
  - [x] statusStore.ts (Event status tracking)
  - [x] scoreStore.ts (Score management)
  - [x] leaderboardStore.ts (MainLeaderboardCard state)
- [x] Implement basic layout structure
  - [x] Dashboard header
  - [x] Main content area
  - [x] Footer

#### Phase 2: Core Components
- [x] Build EventSections component
  - [x] Live Section
    - [x] MainLeaderboardCard (Special first card)
    - [x] LiveEventCard component
  - [x] Active Section
    - [x] EventCard component
    - [x] AddEventCard component
  - [x] Archived Section
- [x] Implement event status system
  - [x] Status tracking
  - [x] Status transitions
  - [x] Status-based filtering

#### Phase 3: Functionality
- [ ] Event Management
  - [ ] Create new event flow
  - [ ] Edit event functionality
  - [ ] Archive event handling
  - [ ] Delete event handling
- [ ] Score Integration
  - [ ] Real-time score updates
  - [ ] Score count tracking
  - [ ] Player count tracking
- [ ] Transition System
  - [ ] Card movement animations
  - [ ] Section transitions
  - [ ] Loading states

#### Phase 4: Polish & Optimization
- [ ] Performance Optimization
  - [ ] Implement virtual scrolling
  - [ ] Optimize re-renders
  - [ ] Cache computed values
- [ ] Error Handling
  - [ ] Network error states
  - [ ] Loading error states
  - [ ] Fallback UI
- [ ] Testing
  - [ ] Component unit tests
  - [ ] Integration tests
  - [ ] Performance testing
- [ ] Documentation
  - [ ] Component documentation
  - [ ] State management docs
  - [ ] Transition system docs

#### Phase 5: Migration & Launch
- [ ] Feature Flag System
  - [ ] Implement feature flags
  - [ ] A/B testing setup
- [ ] Migration Strategy
  - [ ] Data migration plan
  - [ ] User transition plan
- [ ] Launch Preparation
  - [ ] Performance monitoring
  - [ ] Error tracking
  - [ ] Analytics integration

### 🎨 UI Improvements
- [ ] Skeleton loaders for:
  - Events dashboard
  - Scorecard
  - Leaderboard
- [ ] Add polished date picker (icon, clear button)
- [ ] Input validation + trimming (e.g., title, slug)
- [ ] Show save feedback (toast or inline "Saved ✅")
- [ ] Add loading spinner to all Save buttons


### 🧪 6. Pre-Launch Checklist
- [ ] Mobile testing for scorecard, leaderboard, admin
- [ ] 404 page for bad slugs or event not found
- [ ] SEO meta tags on public leaderboard pages
- [ ] Add Meta Pixel + Google Analytics if needed
- [ ] Set up custom domain in Vercel (ldrboard.co, score.clubgreen.au, etc.

### 🔄 Database Types Regeneration
#### Phase 1: Preparation
- [x] Review current database schema
  - [x] Verify events table structure
  - [x] Verify scorecard table structure
  - [x] Verify organizations table structure
- [x] Document affected files
  - [x] src/lib/database.types.ts
  - [x] src/lib/types.ts
  - [x] src/lib/validations.ts
  - [x] All components using database types

#### Phase 2: Implementation
- [x] Set up Supabase CLI
  - [x] Install Supabase CLI if not present (already installed as dev dependency)
  - [x] Configure project connection (project ID already configured)
- [x] Generate new types
  - [x] Run type generation command
  - [x] Review generated types
  - [x] Update type definitions
- [x] Update Zod schemas
  - [x] Align with new database types
  - [x] Add validation rules
  - [x] Update error messages

#### Phase 3: Testing & Validation
- [x] Type checking
  - [x] Run TypeScript compiler
  - [ ] Fix any type errors
  - [ ] Verify type safety
- [ ] Integration testing
  - [ ] Test database queries
  - [ ] Verify RLS policies
  - [ ] Check API endpoints
- [x] Documentation
  - [x] Update type documentation
  - [x] Document changes
  - [ ] Add migration notes

### Example Zod Schema Updates
```typescript
// src/lib/validations.ts
import { z } from 'zod';
import type { Database } from './database.types';

// Event validation
export const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  short_code: z.string().length(6, 'Short code must be 6 characters'),
  access_uuid: z.string().uuid('Invalid UUID format'),
  organization_id: z.string().uuid('Invalid organization ID').nullable(),
  event_date: z.string().datetime().nullable(),
  published: z.boolean().nullable(),
  settings_json: z.record(z.unknown()).nullable()
});

// Scorecard validation
export const scorecardSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  score: z.number().int().min(0, 'Score must be positive'),
  hole_number: z.number().int().min(1).max(18).nullable(),
  hole_in_ones: z.number().int().min(0).nullable(),
  tiebreaker_rank: z.number().int().min(1).nullable(),
  published: z.boolean().nullable(),
  event_id: z.string().uuid('Invalid event ID').nullable(),
  player_id: z.string().uuid('Invalid player ID').nullable()
});

// Organization validation
export const organizationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  org_leaderboard_codes: z.record(z.unknown()),
  settings_json: z.record(z.unknown()).nullable(),
  payment_up_to_date: z.boolean(),
  subscription_status: z.string().nullable()
});
```

### Affected Files
1. `src/lib/database.types.ts`
   - Complete replacement with generated types
   - Update type exports

2. `src/lib/types.ts`
   - Update interface definitions
   - Align with database types

3. `src/lib/validations.ts`
   - Update Zod schemas
   - Add new validation rules

4. Components using database types:
   - `src/routes/dashboard-new/+page.svelte`
   - `src/routes/dashboard-new/EventSections.svelte`
   - `src/routes/dashboard-new/LiveEventCard.svelte`
   - `src/routes/dashboard-new/EventCard.svelte`
   - `src/routes/dashboard-new/AddEventCard.svelte`

### Steps to Achieve
1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Generate types:
   ```bash
   supabase gen types typescript --project-id your-project-id > src/lib/database.types.ts
   ```

3. Update Zod schemas:
   - Copy example schemas to `src/lib/validations.ts`
   - Adjust validation rules as needed

4. Test changes:
   ```bash
   npm run check
   npm run dev
   ```

5. Verify functionality:
   - Test database queries
   - Check type safety
   - Validate forms
   - Test API endpoints

