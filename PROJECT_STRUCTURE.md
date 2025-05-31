# Project Structure

```
.
├── PROJECT_STRUCTURE.md
├── README.md
├── SUBSCRIPTION_FLOW.md
├── TASKS.md
├── cert/
│   ├── cert.pem
│   └── key.pem
├── clubgreen-logo.svg
├── eslint.config.js
├── package-lock.json
├── package.json
├── src/
│   ├── app.d.ts
│   ├── app.html
│   ├── hooks.server.ts
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ui/
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
│   │   ├── server/
│   │   │   └── stripe/
│   │   │       └── client.ts
│   │   ├── styles/
│   │   │   ├── EditEvent.css
│   │   │   ├── admin.css
│   │   │   ├── base.css
│   │   │   ├── dashboard.css
│   │   │   ├── leaderboard.css
│   │   │   ├── login.css
│   │   │   ├── onboarding.css
│   │   │   ├── scorecard.css
│   │   │   └── theme.css
│   │   ├── supabase/
│   │   │   └── server.ts
│   │   ├── supabaseClient.ts
│   │   ├── toastStore.js
│   │   └── types/
│   │       ├── event.ts
│   │       └── score.ts
│   ├── routes/
│   │   ├── [org]/
│   │   │   └── [event]/
│   │   │       ├── leaderboard/
│   │   │       │   └── +page.svelte
│   │   │       └── scorecard/
│   │   │           └── +page.svelte
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── magic-link/
│   │   │   │       └── +server.ts
│   │   │   ├── billing-portal/
│   │   │   │   └── +server.ts
│   │   │   ├── create-checkout/
│   │   │   │   └── +server.ts
│   │   │   ├── create-checkout-session/
│   │   │   │   └── +server.ts
│   │   │   ├── env-test/
│   │   │   │   └── +server.ts
│   │   │   ├── start-trial/
│   │   │   │   └── +server.ts
│   │   │   ├── webhook/
│   │   │   │   └── +server.ts
│   │   │   └── webhooks/
│   │   │       └── stripe/
│   │   │           └── +server.ts
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── +page.svelte
│   │   ├── dashboard/
│   │   │   ├── [event_id]/
│   │   │   │   └── setup/
│   │   │   │       └── +page.svelte
│   │   │   ├── settings/
│   │   │   │   └── +page.svelte
│   │   │   ├── +page.server.ts
│   │   │   └── +page.svelte
│   │   ├── login/
│   │   │   ├── +page.js
│   │   │   └── +page.svelte
│   │   ├── onboarding/
│   │   │   └── +page.svelte
│   │   ├── pricing/
│   │   ├── test/
│   │   │   └── +page.svelte
│   │   ├── +layout.server.ts
│   │   ├── +layout.svelte
│   │   └── +page.svelte
│   └── types/
│       └── leo-profanity.d.ts
├── static/
│   ├── favicon.png
│   └── logos/
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
├── supabase/
│   └── config.toml
├── supabase-tables.md
├── svelte.config.js
├── tiebreakgame.md
├── tsconfig.json
└── vite.config.ts
```
