# Project Structure

```
.
├── PROJECT_STRUCTURE.md     # This file - documents the project structure
├── README.md               # Project documentation
├── SUBSCRIPTION_FLOW.md    # Subscription and payment flow documentation
├── TASKS.md                # Current tasks and TODOs
├── cert/                   # SSL certificates for local development
│   ├── cert.pem
│   └── key.pem
├── clubgreen-logo.svg      # Main logo
├── eslint.config.js        # ESLint configuration
├── package-lock.json       # NPM lock file
├── package.json            # Project configuration and dependencies
├── src/                    # Source code
│   ├── app.d.ts           # TypeScript type declarations
│   ├── app.html           # Main HTML template
│   ├── hooks.server.ts    # SvelteKit server hooks
│   ├── lib/               # Shared utilities and components
│   │   ├── components/    # Reusable UI components
│   │   │   ├── ui/        # Base UI components
│   │   │   │   └── button.svelte
│   │   │   ├── Button.svelte
│   │   │   ├── LeaderboardModal.svelte
│   │   │   ├── LoadingSpinner.svelte
│   │   │   └── TiebreakerModal.svelte
│   │   ├── DashboardHeader.svelte
│   │   ├── FileUpload.svelte
│   │   ├── QRCodeModal.svelte
│   │   ├── ToastHost.svelte
│   │   ├── TrialStatus.svelte
│   │   ├── server/        # Server-side utilities
│   │   │   └── stripe/    # Stripe integration
│   │   │       └── client.ts
│   │   ├── styles/        # Global styles
│   │   │   ├── EditEvent.css
│   │   │   ├── admin.css
│   │   │   ├── base.css
│   │   │   ├── dashboard.css
│   │   │   ├── leaderboard.css
│   │   │   ├── login.css
│   │   │   ├── onboarding.css
│   │   │   ├── scorecard.css
│   │   │   └── theme.css
│   │   ├── supabase/      # Supabase client and utilities
│   │   │   └── server.ts
│   │   ├── supabaseClient.ts  # Supabase client initialization
│   │   ├── toastStore.js  # Toast notification store
│   │   └── types/         # TypeScript type definitions
│   │       ├── event.ts
│   │       └── score.ts
│   ├── routes/            # Application routes
│   │   ├── [org]/         # Organization-specific routes
│   │   │   └── [event]/   # Event-specific routes
│   │   │       ├── leaderboard/
│   │   │       │   └── +page.svelte
│   │   │       └── scorecard/
│   │   │           └── +page.svelte
│   │   ├── api/           # API endpoints
│   │   │   ├── auth/      # Authentication endpoints
│   │   │   │   └── magic-link/
│   │   │   │       └── +server.ts
│   │   │   ├── billing-portal/  # Billing management
│   │   │   │   └── +server.ts
│   │   │   ├── create-checkout/  # Checkout flow
│   │   │   │   └── +server.ts
│   │   │   ├── create-checkout-session/
│   │   │   │   └── +server.ts
│   │   │   ├── env-test/  # Environment testing
│   │   │   │   └── +server.ts
│   │   │   ├── start-trial/  # Trial management
│   │   │   │   └── +server.ts
│   │   │   ├── webhook/    # Webhook handlers
│   │   │   │   └── +server.ts
│   │   │   └── webhooks/   # External service webhooks
│   │   │       └── stripe/
│   │   │           └── +server.ts
│   │   ├── auth/          # Authentication routes
│   │   │   └── callback/  # OAuth callbacks
│   │   │       └── +page.svelte
│   │   ├── dashboard/     # User dashboard
│   │   │   ├── [event_id]/
│   │   │   │   └── setup/
│   │   │   │       └── +page.svelte
│   │   │   ├── settings/  # User settings
│   │   │   │   └── +page.svelte
│   │   │   ├── +page.server.ts
│   │   │   └── +page.svelte
│   │   ├── login/         # Login page
│   │   │   ├── +page.js
│   │   │   └── +page.svelte
│   │   ├── onboarding/    # User onboarding
│   │   │   └── +page.svelte
│   │   ├── pricing/       # Pricing page
│   │   ├── test/          # Test routes
│   │   │   └── +page.svelte
│   │   ├── +layout.server.ts  # Server layout
│   │   ├── +layout.svelte     # Root layout
│   │   └── +page.svelte       # Home page
│   └── types/             # Global type definitions
│       └── leo-profanity.d.ts  # Profanity filter types
├── static/                # Static assets
│   ├── favicon.png        # Site favicon
│   └── logos/             # Logo variations
│       ├── ldrb-icon-black.png
│       ├── ldrb-icon-black.svg
│       ├── ldrb-icon-white.png
│       ├── ldrb-icon-white.svg
│       ├── ldrb-logo-black.png
│       ├── ldrb-logo-black.svg
│       ├── ldrb-logo-colourdark.png
│       ├── ldrb-logo-colourdark.svg
│       ├── ldrb-logo-colourlight.png
│       ├── ldrb-logo-colourlight.svg
│       ├── ldrb-logo-white.png
│       └── ldrb-logo-white.svg
├── supabase/             # Supabase configuration
│   ├── config.toml       # Local Supabase config
│   └── migrations/       # Database migrations
├── supabase-tables.md    # Database schema documentation
├── svelte.config.js      # SvelteKit configuration
├── tiebreakgame.md       # Game rules documentation
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite build configuration
```
