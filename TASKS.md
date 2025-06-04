### 🔐 Auth Flow Rebuild
- [x] Create hooks.server.ts with Supabase SSR client
- [x] Implement secure getUser() method
- [x] Create login page with email+password and magic link
- [x] Implement auth callback handler
- [x] Set up dashboard layout protection
- [ ] Create onboarding page with organization setup
- [ ] Implement Stripe customer creation

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