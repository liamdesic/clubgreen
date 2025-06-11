.
├── LEADERBOARD-DEPLOYMENT.md
├── README.md
├── TASKS.md
├── THE-BRAIN-LEADERBOARD-SYSTEM.md
├── THE-BRAIN-SYSTEMS-AUTH.md
├── THE-BRAIN-TYPES-STORES.md
├── THE-BRAIN-UTILS-FUNCTIONS.md
├── cert
│   ├── cert.pem
│   └── key.pem
├── clubgreen-logo.svg
├── eslint.config.js
├── leaderboard-rebuild-brief.md
├── package-lock.json
├── package.json
├── project-tree.md
├── src
│   ├── ambient.d.ts
│   ├── app.d.ts
│   ├── app.html
│   ├── hooks.server.ts
│   ├── lib
│   │   ├── ToastHost.svelte
│   │   ├── components
│   │   │   ├── Button.svelte
│   │   │   ├── FileUpload.svelte
│   │   │   ├── LoadingSpinner.svelte
│   │   │   ├── dashboard
│   │   │   │   ├── AddEventCard.svelte
│   │   │   │   ├── ArchivedEventsSection.svelte
│   │   │   │   ├── ColorPalette.svelte
│   │   │   │   ├── DashboardMainHeader.svelte
│   │   │   │   ├── DashboardPageHeader.svelte
│   │   │   │   ├── EmptyDashboard.svelte
│   │   │   │   ├── EventCard.svelte
│   │   │   │   ├── EventManagement.svelte
│   │   │   │   ├── HoleSelector.svelte
│   │   │   │   ├── MainLeaderboardCard.svelte
│   │   │   │   ├── NewRoundModal.svelte
│   │   │   │   ├── QRCodeModal.svelte
│   │   │   │   ├── TrialStatus.svelte
│   │   │   │   └── index.svelte
│   │   │   ├── leaderboard
│   │   │   │   ├── LeaderboardHeader.svelte
│   │   │   │   ├── LeaderboardLayout.svelte
│   │   │   │   ├── LeaderboardRotationStatus.svelte
│   │   │   │   ├── LeaderboardScores.svelte
│   │   │   │   ├── LeaderboardSidebar.svelte
│   │   │   │   ├── RotationStatus.svelte
│   │   │   │   ├── TimeRangeBadge.svelte
│   │   │   │   └── TransitionOverlay.svelte
│   │   │   ├── scorecard
│   │   │   │   ├── LeaderboardModal.svelte
│   │   │   │   ├── RecoveryPrompt.svelte
│   │   │   │   └── ScorecardView.svelte
│   │   │   └── ui
│   │   │       └── button.svelte
│   │   ├── config.ts
│   │   ├── database.types.ts
│   │   ├── index.ts
│   │   ├── runtime
│   │   │   ├── board.types.ts
│   │   │   ├── boardRuntime.ts
│   │   │   ├── index.ts
│   │   │   └── scoreSnapshot.ts
│   │   ├── server
│   │   │   ├── stripe
│   │   │   │   └── client.ts
│   │   │   └── supabaseAdmin.ts
│   │   ├── stores
│   │   │   ├── source
│   │   │   │   ├── eventSource.ts
│   │   │   │   ├── orgSource.ts
│   │   │   │   ├── scoresSource.ts
│   │   │   │   └── snapshotSource.ts
│   │   │   ├── toastStore.ts
│   │   │   └── view
│   │   │       ├── LeaderboardViewStore.ts
│   │   │       ├── RotationStore.ts
│   │   │       ├── UIStateStore.ts
│   │   │       └── index.ts
│   │   ├── styles
│   │   │   ├── DashboardSettings.css
│   │   │   ├── EditEvent.css
│   │   │   ├── admin.css
│   │   │   ├── base.css
│   │   │   ├── dashboard.css
│   │   │   ├── leaderboard.css
│   │   │   ├── login.css
│   │   │   ├── onboarding.css
│   │   │   ├── scorecard.css
│   │   │   ├── theme.css
│   │   │   └── tippy.css
│   │   ├── supabaseClient.ts
│   │   ├── utils
│   │   │   ├── codeUtils.ts
│   │   │   ├── eventStatus.ts
│   │   │   ├── eventUtils.ts
│   │   │   ├── generalUtils.ts
│   │   │   ├── jsonUtils.ts
│   │   │   ├── leaderboardUtils.ts
│   │   │   ├── scoreCalculator.ts
│   │   │   ├── scorecardUtils.ts
│   │   │   └── timeFiltersUtils.ts
│   │   ├── validations
│   │   │   ├── dateSchemas.ts
│   │   │   ├── errorSchemas.ts
│   │   │   ├── leaderboardView.ts
│   │   │   ├── organizationForm.ts
│   │   │   ├── playerScore.ts
│   │   │   ├── timeFilter.ts
│   │   │   └── validationUtils.ts
│   │   └── validations.ts
│   ├── params
│   │   └── org.ts
│   ├── routes
│   │   ├── +error.svelte
│   │   ├── +layout.svelte
│   │   ├── +page.svelte
│   │   ├── [org]
│   │   │   ├── [code]
│   │   │   │   ├── +page.svelte
│   │   │   │   └── test
│   │   │   │       └── +page.svelte
│   │   │   ├── [event]
│   │   │   │   └── leaderboard
│   │   │   │       └── +page.svelte.backup
│   │   │   ├── lb
│   │   │   │   ├── +layout.server.ts
│   │   │   │   ├── +layout.svelte
│   │   │   │   └── [shortcode]
│   │   │   │       ├── +page.server.ts
│   │   │   │       └── +page.svelte
│   │   │   ├── mb
│   │   │   └── ob
│   │   │       └── [code]
│   │   ├── api
│   │   │   ├── billing-portal
│   │   │   │   └── +server.ts
│   │   │   ├── cancel-subscription
│   │   │   │   └── +server.ts
│   │   │   ├── create-checkout
│   │   │   │   └── +server.ts
│   │   │   ├── env-test
│   │   │   │   └── +server.ts
│   │   │   ├── start-trial
│   │   │   └── webhooks
│   │   │       └── stripe
│   │   │           └── +server.ts
│   │   ├── auth
│   │   │   └── callback
│   │   │       └── +page.server.ts
│   │   ├── dashboard
│   │   │   ├── +layout.server.ts
│   │   │   ├── +page.svelte
│   │   │   ├── [code]
│   │   │   │   └── setup
│   │   │   │       ├── +page.svelte
│   │   │   │       ├── AdvertisementSettings.svelte
│   │   │   │       ├── BackToDashboardButton.svelte
│   │   │   │       ├── EventActions.svelte
│   │   │   │       ├── EventDetailsForm.svelte
│   │   │   │       ├── LeaderboardSettings.svelte
│   │   │   │       └── PlayerManagementTable.svelte
│   │   │   ├── customize
│   │   │   │   ├── +page.server.ts
│   │   │   │   └── +page.svelte
│   │   │   ├── dashboard-new
│   │   │   │   └── +page.svelte
│   │   │   └── settings
│   │   │       ├── +page.server.ts
│   │   │       └── +page.svelte
│   │   ├── login
│   │   │   └── +page.svelte
│   │   ├── onboarding
│   │   │   ├── +page.server.ts
│   │   │   └── +page.svelte
│   │   ├── test
│   │   └── transition-test
│   │       └── +page.svelte
│   └── types
│       ├── leo-profanity.d.ts
│       └── lucide-svelte.d.ts
├── static
│   ├── badges
│   │   ├── bronze-badge.png
│   │   ├── gold-badge.png
│   │   └── silver-badge.png
│   ├── favicon.png
│   ├── fontawesome-subset.css
│   ├── leaderboard-preload.css
│   ├── logos
│   │   ├── ldrb-icon-black.png
│   │   ├── ldrb-icon-black.svg
│   │   ├── ldrb-icon-white.png
│   │   ├── ldrb-icon-white.svg
│   │   ├── ldrb-logo-black.png
│   │   ├── ldrb-logo-black.svg
│   │   ├── ldrb-logo-colourdark.png
│   │   ├── ldrb-logo-colourdark.svg
│   │   ├── ldrb-logo-colourlight.png
│   │   ├── ldrb-logo-colourlight.svg
│   │   ├── ldrb-logo-white.png
│   │   └── ldrb-logo-white.svg
│   └── skeleton
│       ├── AddEventPost.png
│       ├── AddEventPre.png
│       ├── CoursePost.png
│       ├── CoursePre.png
│       ├── EventPost.png
│       └── EventPre.png
├── supabase
│   ├── config.toml
│   ├── deno.json
│   ├── functions
│   │   ├── _shared
│   │   │   ├── supabaseClient.ts
│   │   │   └── types.gen.ts
│   │   └── update-leaderboard
│   │       ├── README.md
│   │       └── index.ts
│   ├── import_map.json
│   └── migrations
├── svelte.config.js
├── test
│   ├── fixtures
│   │   └── stripe
│   │       └── customer.subscription.created.json
│   ├── mocks
│   │   ├── env
│   │   │   ├── private.js
│   │   │   └── public.js
│   │   └── stripe
│   │       └── types.ts
│   ├── setup.ts
│   └── unit
│       ├── api
│       │   └── webhooks
│       │       └── stripe.test.ts
│       └── auth
│           ├── login.test.ts
│           └── supabase.test.ts
├── tiebreakgame.md
├── tsconfig.json
├── types-rebuild.md
├── utility-review.md
├── view-stores-plan.md
├── vite.config.ts
└── vitest.config.ts

70 directories, 180 files
