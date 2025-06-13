# Dashboard Area - Club Green

## Routes
- `/dashboard/` - Main dashboard (events list)
- `/dashboard/[code]/setup/` - Event configuration  
- `/dashboard/customize/` - Branding settings
- `/dashboard/settings/` - Account management
- `/dashboard/manage/` - Player management

## Auth Flow
1. `+layout.server.ts` - Auth guard, loads user + org data
2. Redirects to `/onboarding` if no organization exists
3. Loads organization events and settings

## Key Components
- `DashboardMainHeader.svelte` - Top navigation
- `EventCard.svelte` - Event list items
- `NewRoundModal.svelte` - Create new event
- `QRCodeModal.svelte` - QR code display
- `EventForm.svelte` - Event configuration
- `PlayerManagementTable.svelte` - Player CRUD

## Data Flow
- Organization data cached in layout loader
- Events fetched with Zod validation
- Real-time subscriptions for live updates
- Form actions use Zod + Supabase patterns