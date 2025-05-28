# 🏌️ Mini-Golf Leaderboard - Project Tasks

## 🔐 Supabase Auth Implementation
**Goal:** Switch to Supabase's default auth flow and add email/password authentication

### ✅ Prerequisites
- [ ] Set up Supabase Auth settings in the dashboard
  - [ ] Increase refresh token expiration to at least 90 days (or as long as users should stay logged in)
  - [ ] Set the password reset redirect URL to point to `/reset-password` page

### ✅ 1. Update Supabase Client - COMPLETED
**File:** `src/lib/supabaseClient.ts`
- [x] Remove `CustomStorage` class implementation
- [x] Update Supabase client initialization to use default session handling
- [x] Remove all manual cookie management code
- [x] Remove any direct token handling logic

### 📝 2. Update Login Page
**File:** `src/routes/login/+page.svelte`
- [ ] Add email/password login form
- [ ] Add email/password signup form
- [ ] Implement form validation
- [ ] Add loading states and error handling
- [ ] Add "Forgot password?" functionality
- [ ] Style forms to match existing design system

### 🔑 3. Implement Auth Methods
- [ ] Email/Password Sign Up
  - [ ] Add form submission handler
  - [ ] Call `supabase.auth.signUp({ email, password })`
  - [ ] Handle success/error states
  - [ ] Block sign up if an account already exists for this org/email
  - [ ] Show friendly error message if signup is blocked
  - [ ] Add email confirmation flow

- [ ] Email/Password Login
  - [ ] Add form submission handler
  - [ ] Call `supabase.auth.signInWithPassword({ email, password })`
  - [ ] Handle success/error states
  - [ ] Redirect to dashboard on success

- [ ] Password Reset
  - [ ] Add "Forgot password?" link
  - [ ] Implement password reset request
  - [ ] Create password reset page at `/reset-password`
  - [ ] Handle password update flow
  - [ ] Ensure Supabase dashboard has the correct reset password redirect URL set

### 🔒 4. Single Account per Org
- [ ] Add organization check during signup
- [ ] Prevent multiple accounts for same organization
- [ ] Add appropriate error messages

### 🔍 5. Add Auth Status Logging
- [ ] Add console logging of auth status on every page
  - [ ] Log when user is authenticated and display their email
  - [ ] Log when user is not authenticated
  - [ ] Include timestamp in logs for debugging
  - [ ] Add this to the root layout or a shared component

### 🧪 6. Testing
- [ ] Test signup flow
- [ ] Test login flow
- [ ] Test password reset flow
- [ ] Test session persistence
- [ ] Test multiple browser sessions
- [ ] Test error scenarios

### 🧹 6. Cleanup
- [ ] Remove unused authentication code
- [ ] Remove custom cookie handling
- [ ] Update documentation
- [ ] Verify all auth-related functionality works

## ✅ Completed
- [x] QR code generation (client-side, dynamic URLs)
- [x] Scorecard pulls dynamic event + score data via slug
- [x] Panel-based edit UI tested
- [x] Toast system working globally

## 🛠️ In Progress

### 🔄 1. Account & Event Settings Refactor
**Route:** `/dashboard/organization/settings`
- [x] Create organization settings page
  - [x] Add organization logo upload component
  - [x] Add ad image upload component
  - [x] Save images to Supabase storage
  - [x] Store image URLs in organization settings
  - [x] Add form validation and error handling
  - [x] Implement accent color picker
  - [x] Add billing email field
  - [ ] Add organization name editing

### 🎨 2. Leaderboard Restyling
- [x] **QR Code Generation**
  - [x] Generate QR code natively for scorecard URL
  - [x] Display in designated box with animations
  - [x] Dynamic color based on event settings
- [x] **Theme & Styling**
  - [x] Implement dynamic accent color theming across leaderboard and scorecard
  - [x] Update CSS variables in leaderboard.css and scorecard.css
  - [x] Add dynamic dark accent color variant
  - [x] Ensure color contrast meets accessibility standards
  - [x] Update header and background styles to use new color scheme
- [ ] **Header**
  - [x] Add logo in top left corner
  - [x] Show event title and date
  - [x] Style header with dynamic accent color
  - [ ] Add responsive behavior for mobile devices
- [ ] **Dynamic Score Display**
  - [ ] Keep left score box static (positions 1-4)
  - [ ] Implement rotation for right score box (5-10, 11-15, 16-20)
  - [ ] Set 4-second interval for rotation
  - [ ] Add smooth transitions between rotations
  - [ ] Ensure score display is readable with new color scheme
- [ ] **Visual Hierarchy**
  - [ ] Add top 3 medal styling (🥇, 🥈, 🥉)
  - [ ] Show hole-in-ones count
  - [ ] Highlight current rotation group
  - [ ] Style score pills with accent color
  - [ ] Add subtle hover effects for interactive elements
- [ ] **Responsive Design**
  - [ ] Optimize for mobile and iPad
  - [ ] Adjust layout for different screen sizes
  - [ ] Ensure touch targets are appropriately sized

## 💰 4. Stripe Billing Integration

### Database Updates
- [x] Add `subscriptions` table:
  - `id` (UUID, primary key)
  - `organization_id` (UUID, foreign key to organizations)
  - `stripe_customer_id` (text)
  - `stripe_subscription_id` (text, nullable)
  - `status` (text: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid')
  - `current_period_end` (timestamp with time zone)
  - `trial_ends_at` (timestamp with time zone)
  - `created_at` (timestamp with time zone)
  - `updated_at` (timestamp with time zone)

- [x] Add `payment_up_to_date` (boolean) to `organizations` table
- [x] Create RLS policies for subscription data

### Stripe Setup
- [x] Create Stripe account and get API keys
- [x] Set up Stripe webhook endpoint
- [x] Create product and price in Stripe dashboard:
  - Name: "ldrboard Standard"
  - Price: $20 AUD/month
  - No trial period (handled in code)
- [x] Add Stripe.js and Stripe Node.js client

### UI Components
- [x] Create `/subscribe` page with:
  - [x] Free trial option (no credit card)
    - [x] Connect to `/api/start-trial` endpoint
    - [x] Add loading states and error handling
  - [x] Subscribe now option (with credit card)
    - [x] Connect to `/api/create-checkout` endpoint
    - [x] Add loading states and error handling
  - [x] Test mode support
- [ ] Create subscription management component in dashboard
- [ ] Add payment method collection flow (pre-trial end)
- [ ] Implement trial status banner with countdown
- [ ] Add payment success/failure handling

### Backend Implementation
- [x] Create API endpoints:
  - [x] `POST /api/start-trial` - Starts no-credit-card trial
  - [x] `POST /api/create-checkout` - Creates paid subscription
  - [x] `GET /api/billing-portal` - Manages billing
  - [x] `POST /api/webhook` - Handles Stripe events

- [x] Implement webhook handlers for:
  - [x] `customer.subscription.created` - Track new subscriptions
  - [x] `customer.subscription.updated` - Handle status changes
  - [x] `customer.subscription.deleted` - Clean up canceled subs
  - [x] `invoice.payment_succeeded` - Update payment status
  - [x] `invoice.payment_failed` - Handle payment issues
  - [x] `customer.subscription.trial_will_end` - Send reminder (3 days before)

### No-Credit-Card Trial Flow
- [ ] **Trial Start**:
  - Create Stripe customer without payment method
  - Create subscription with `trial_period_days: 14`
  - Set `status: 'trialing'` in database
  - Set `trial_ends_at` to now + 14 days
  - Send welcome email with trial details

- [ ] **During Trial**:
  - Show trial status in dashboard
  - Display days remaining
  - Add "Add Payment Method" button
  - Send reminders at 7, 3, and 1 day(s) before end

- [ ] **Before Trial End**:
  - Require payment method to continue
  - Show warning banner in dashboard
  - Send email reminders

- [ ] **After Trial**:
  - If payment method added: Convert to paid
  - If no payment method: Set status to 'canceled'
  - Send appropriate notifications

### Paid Subscription Flow
- [ ] **Subscribe Now**:
  - Collect payment method during checkout
  - Create subscription with `trial_period_days: 0`
  - Set status to 'active' immediately
  - Grant full access

- [ ] **Subscription Management**:
  - Allow plan changes
  - Handle payment method updates
  - Enable cancellation (with grace period)

### Access Control
- [ ] Add middleware to check subscription status on protected routes
- [ ] Restrict access to scorecard/leaderboard based on `payment_up_to_date`
- [ ] Show upgrade prompts for expired trials/accounts

### Testing
- [ ] Test subscription flow with test cards
- [ ] Test trial expiration
- [ ] Test failed payment handling
- [ ] Test webhook delivery

### Documentation
- [ ] Add billing section to README
- [ ] Document environment variables
- [ ] Add Stripe webhook setup instructions

## 📋 Backlog

### 🎯 Scorecard Improvements

#### Player Input & Management
- [ ] **Enhanced Player Name Input**
  - [x] Add form submission on mobile keyboard 'enter'
  - [x] Implement 18-character limit for player names with toast notification
  - [x] Add profanity filter using a prebuilt library
  - [?] Add input validation feedback

#### Gameplay Experience
- [x] **Flexible Player Selection** ✅
  - [x] Player Selection Flow
  - [x] Interaction Guidelines
  - [x] Score Recording Logic
  - [x] Game State Management

#### Visual Enhancements
- [x] **Player Transition Animations** ✅
  > *Skipped animations for performance and simplicity*

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

## 🏗️ Implementation Plan

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
- Unit tests for utility functions
- Component tests for UI elements
- End-to-end tests for critical user flows
- Cross-browser and device testing