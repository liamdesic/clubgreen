# 🏌️ Mini-Golf Leaderboard - Project Tasks

## 🔍 Environment Variable Consistency Check

### Search Patterns to Verify
- [ ] Search for `process.env` - Should not be used in SvelteKit
- [ ] Search for `import.meta.env` - Only for build-time public variables
- [ ] Search for `$env/static/private` - For private build-time variables
- [ ] Search for `$env/static/public` - For public build-time variables
- [ ] Search for `$env/dynamic/private` - For private runtime variables
- [ ] Search for `$env/dynamic/public` - For public runtime variables
- [ ] Search for `VITE_` prefix - Should be migrated to `PUBLIC_`
- [ ] Search for direct `env.` usage - Should reference the correct env import

### Files to Check
- [ ] `src/routes/api/webhooks/stripe/+server.ts` - Fixed env reference
- [ ] `src/lib/server/stripe/client.ts` - Uses dynamic private env
- [ ] `src/hooks.server.ts` - Uses static public env
- [ ] `src/lib/supabase/server.ts` - Uses import.meta.env
- [ ] `src/lib/supabaseClient.ts` - Uses import.meta.env
- [ ] `vite.config.ts` - Handles env variable exposure

### Verification Steps
1. [ ] Ensure all private variables use `$env/static/private` or `$env/dynamic/private`
2. [ ] Ensure all public variables use `$env/static/public` or `$env/dynamic/public`
3. [ ] Verify no direct `process.env` usage remains
4. [ ] Check for any remaining `VITE_` prefixes that should be `PUBLIC_`
5. [ ] Test all environment-dependent features after changes

## 🔄 Environment Variable Standardization
- [ ] **Codebase Audit**
  - [ ] Search for all instances of `VITE_` in the codebase
  - [ ] Document all files using Vite-specific environment variables
  - [ ] Create a mapping of VITE_* to PUBLIC_* equivalents

- [ ] **Code Updates**
  - [ ] Update all imports from `$env/static/public` to use PUBLIC_ prefix
  - [ ] Update any dynamic imports using `import.meta.env.VITE_*` to use `PUBLIC_`
  - [ ] Update any build configurations or Vite plugins referencing VITE_ variables

- [ ] **Environment Configuration**
  - [ ] Update `.env` files to consolidate on PUBLIC_ prefix
  - [ ] Remove duplicate VITE_ variables that shadow PUBLIC_ variables
  - [ ] Update deployment configurations (Vercel, etc.) to use new variable names

- [ ] **Documentation**
  - [ ] Update SUBSCRIPTION_FLOW.md to remove VITE_ references
  - [ ] Update any other documentation referencing environment variables
  - [ ] Add a section about environment variable naming conventions

- [ ] **Testing**
  - [ ] Test all environment-dependent features in development
  - [ ] Verify build process works with new variable names
  - [ ] Test deployment to staging/production environments

## ✅ Completed
- [x] QR code generation (client-side, dynamic URLs)
- [x] Scorecard pulls dynamic event + score data via slug
- [x] Panel-based edit UI tested
- [x] Toast system working globally

## 🛠️ In Progress

### 💳 Stripe Integration & Billing
- [x] **Automatic Trial on Organization Creation**
  - [x] Create Stripe customer during organization creation
  - [x] Set up 14-day trial subscription
  - [x] Handle duplicate organization slugs
  - [x] Proper environment variable setup
  - [x] Error handling and user feedback
  - [x] Store Stripe customer and subscription IDs

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
- [x] Create subscription plan in Stripe dashboard with 14-day trial
- [x] Add Stripe.js and Stripe Node.js client
- [x] Implement server-side webhook handler
- [x] Create checkout session endpoint with trial support

### Testing Stripe Integration

#### 1. Local Testing Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

#### 2. Test Subscription Flow
1. **Test Mode**:
   - Sign up and finish onboarding
   - Click 
   - The flow will use Stripe's test mode automatically

2. **Test Cards**:
   - Success: 4242 4242 4242 4242
   - Authentication Required: 4000 0025 0000 3155
   - Decline: 4000 0000 0000 0002
   - Fill in other details with any valid future date and CVC
   - Complete the checkout
   - Verify webhook events in Stripe Dashboard
   - Check database for subscription record

3. **Webhook Testing**:
   - Use Stripe CLI to forward webhooks:
     ```bash
     stripe listen --forward-to localhost:5173/api/webhooks/stripe
     ```
   - Test webhook events with Stripe CLI:
     ```bash
     stripe trigger payment_intent.succeeded
     ```

#### 3. Verify Subscription Status
- Check `subscriptions` table for new records
- Verify `organizations.payment_up_to_date` updates correctly
- Test trial period behavior
- Test payment failure scenarios

### Subscription Flow Implementation

#### 1. Account Creation & Authentication
- [x] **Signup Flow**:
  - User signs up with email
  - Receives magic link
  - Automatically starts 14-day trial
  - Trial status managed by Stripe Checkout

#### 2. Trial Status Management
- [ ] **Frontend**: Trial Banner Component
  - [ ] Create persistent banner showing trial status
  - [ ] Display "🎉 Your 14-day free trial has begun! [Upgrade Now]" on first login
  - [ ] Show "⏳ X days left in trial. [Upgrade Now]" on subsequent logins
  - [ ] Banner should be visible on all authenticated routes

#### 3. Upgrade Flow
- [ ] **Frontend**: Upgrade Button
  - [ ] Add [Upgrade Now] button to trial banner
  - [ ] Connect to Stripe Checkout with:
    ```typescript
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        priceId: import.meta.env.STRIPE_PRICE_ID,
        email: userEmail,
        organizationId: currentOrgId
      })
    });
    const { sessionId } = await response.json();
    const stripe = await loadStripe(import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY);
    await stripe.redirectToCheckout({ sessionId });
    ```
  - [ ] Handle successful/failed payment flows via webhooks

#### 4. Webhook Handlers (Implemented)
- [x] `customer.subscription.created`: Create subscription record
- [x] `customer.subscription.updated`: Update trial/status in database
- [x] `customer.subscription.deleted`: Handle subscription cancellation
- [x] `invoice.payment_succeeded`: Update payment status
- [x] `invoice.payment_failed`: Handle payment failures
  - [ ] `invoice.payment_failed`: Notify user and update status

#### 6. Post-Trial Experience
- [ ] **Frontend**: Post-Trial UI
  - [ ] Show upgrade prompt if trial expires without subscription
  - [ ] Restrict access to premium features if needed
  - [ ] Display current subscription status in user settings

### UI Components
- [ ] Create simple `/pricing` page with plan options (optional, can link directly to Stripe Checkout)
- [ ] Create subscription management component in organization settings
- [ ] Handle Stripe Checkout redirects for success/failure

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

### Trial Flow
- [ ] Set `payment_up_to_date = true` for new organizations
- [ ] Set `trial_ends_at` to now + 10 days for new organizations
- [ ] Show trial status and expiration in UI
- [ ] Send trial expiration reminders (3 days, 1 day before)

### Access Control & Edge Cases
- [ ] **Authentication States**:
  - [ ] Handle unauthenticated users trying to access paid features
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