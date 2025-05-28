# Subscription Flow Documentation

This document outlines the complete subscription flow for the ClubGreen application, including Stripe integration, API endpoints, and frontend components.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Environment Variables](#environment-variables)
3. [Frontend Components](#frontend-components)
4. [API Endpoints](#api-endpoints)
5. [Stripe Integration](#stripe-integration)
6. [Test Mode](#test-mode)
7. [Error Handling](#error-handling)
8. [Security Considerations](#security-considerations)

## Validation Checklist

### Environment Variables
- [ ] `PUBLIC_SUPABASE_URL` is set and correct
- [ ] `PUBLIC_SUPABASE_ANON_KEY` is set and valid
- [ ] `STRIPE_SECRET_KEY` is set and has proper permissions
- [ ] `STRIPE_WEBHOOK_SECRET` is set and matches Stripe dashboard
- [ ] `STRIPE_PRICE_ID` is set to a valid Stripe price ID
- [ ] `NEXT_PUBLIC_SITE_URL` is set for proper redirects

### Authentication Flow
- [ ] Magic link login works end-to-end
- [ ] Session is properly maintained during navigation
- [ ] Protected routes redirect to login when unauthenticated
- [ ] Auth state is synchronized across tabs
- [ ] Session expiration is handled gracefully

### Subscription Flow
- [ ] Free trial can be started without payment
- [ ] Checkout session is created successfully
- [ ] Webhook events are received and processed
- [ ] Subscription status is updated in the database
- [ ] Billing portal is accessible to customers

### Testing
- [ ] Test mode works without Stripe API calls
- [ ] Error messages are user-friendly
- [ ] Loading states are properly shown
- [ ] All API endpoints return expected responses
- [ ] Webhook signatures are validated

## Supabase Auth Flow

### 1. Authentication Process

#### Magic Link Login
1. User enters email on `/login` page
2. `POST /api/auth/magic-link` is called with email
3. Supabase generates and sends a magic link
4. User clicks link, which redirects to `/login` with tokens
5. Tokens are extracted from URL and stored in cookies

#### Session Management
- **Cookies Used**:
  - `sb-access-token` - JWT for API authentication
  - `sb-refresh-token` - Used to refresh the access token
  - `sb-provider-token` - OAuth provider token (if using social login)

- **Session Persistence**:
  - Tokens are stored in HTTP-only cookies for security
  - Session is automatically refreshed before expiration
  - Custom storage implementation handles cookie management

### 2. Protected Routes

Server-side protection is implemented in `+page.server.ts` files:

```typescript
// Example from /dashboard/+page.server.ts
export const load: PageServerLoad = async ({ cookies }) => {
  // 1. Get tokens from cookies
  const accessToken = cookies.get('sb-access-token');
  const refreshToken = cookies.get('sb-refresh-token');
  
  // 2. Verify session with Supabase
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    throw redirect(303, '/login');
  }
  
  // 3. Return user data to page
  return { user: session.user };
};
```

### 3. Common Auth Issues

#### Session Not Persisting
- Verify cookies are being set with correct domain/path
- Check if browser is blocking third-party cookies
- Ensure `sameSite` and `secure` flags are properly set

#### Magic Link Not Working
- Check Supabase logs for email sending errors
- Verify email template in Supabase Dashboard
- Ensure redirect URLs are whitelisted in Supabase config

#### Token Refresh Issues
- Check if refresh token rotation is enabled in Supabase
- Verify token expiration times
- Ensure `autoRefreshToken` is enabled in client config

### 4. Supabase Client Configuration

```typescript
// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import { browser } from '$app/environment';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  }
});
```

### 5. Testing Auth Flow

1. **Manual Testing**:
   - Test login/logout flow
   - Verify session persists on page refresh
   - Test navigation between protected routes

2. **Automated Testing**:
   - Mock Supabase auth responses
   - Test error conditions (invalid tokens, network errors)
   - Verify protected route behavior

3. **Debugging**:
   - Check browser's Application > Cookies
   - Monitor Network tab for auth requests
   - Review Supabase logs in dashboard

## Architecture Overview

The subscription system consists of the following key components:

1. **Frontend** (`/src/routes/subscribe/+page.svelte`)
   - Subscription plan selection
   - Checkout flow
   - Test mode interface

2. **API Routes**
   - `/api/create-checkout` - Handles Stripe Checkout session creation
   - `/api/start-trial` - Handles free trial initiation
   - `/api/webhook` - Processes Stripe webhook events

3. **Stripe Integration**
   - Customer management
   - Subscription management
   - Webhook handling

## Environment Variables

Required environment variables for the subscription system:

```env
# Stripe
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# Supabase
PUBLIC_SUPABASE_URL=your-supabase-url
PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Frontend Components

### Subscribe Page (`/src/routes/subscribe/+page.svelte`)

#### Key Features:
- Displays available subscription plans
- Handles test mode functionality
- Manages loading states and error handling
- Integrates with Stripe Checkout

#### Main Functions:

1. **handleSubscribe()**
   - Initiates the subscription flow
   - Handles both test mode and live mode
   - Manages loading states and error handling

2. **startTrial()**
   - Handles free trial initiation
   - Simulates API calls in test mode
   - Manages redirects after successful trial start

## API Endpoints

### 1. Authentication

#### `POST /api/auth/magic-link`
Sends a magic link for passwordless authentication.

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Query Parameters**:
- `redirectTo`: (Optional) URL to redirect to after login

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com"
    }
  }
}
```

### 2. Subscription Management

#### `POST /api/create-checkout`
Creates a Stripe checkout session for new subscriptions.

**Method**: POST
**Authentication**: Required (Session cookie)

**Flow**:
1. Verifies user authentication
2. Fetches organization details
3. Creates or retrieves Stripe customer
4. Creates a checkout session
5. Returns the checkout session URL

**Response**:
```json
{
  "url": "https://checkout.stripe.com/c/pay_...",
  "sessionId": "cs_test_..."
}
```

#### `POST /api/start-trial`
Starts a free trial for the user's organization.

**Method**: POST
**Authentication**: Required (Session cookie)

**Flow**:
1. Verifies user authentication
2. Creates a trial subscription
3. Updates user/organization status
4. Returns success status

**Response**:
```json
{
  "success": true,
  "subscriptionId": "sub_...",
  "status": "trialing",
  "trialEnd": 1740614400
}
```

#### `GET /api/billing-portal`
Generates a Stripe Billing Portal session for subscription management.

**Method**: GET
**Authentication**: Required (Session cookie)

**Response**:
```json
{
  "url": "https://billing.stripe.com/session/..."
}
```

### 3. Webhooks

#### `POST /api/webhook`
Handles Stripe webhook events.

**Events Handled**:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.trial_will_end`

### 4. Development & Debugging

#### `GET /api/env-test`
Returns environment variable information for debugging.

**Response**:
```json
{
  "nodeEnv": "development",
  "publicStripeKey": "***_test",
  "allEnv": {
    "PUBLIC_STRIPE_PUBLISHABLE_KEY": "pk_test_...",
    "NODE_ENV": "development"
  }
}
```

## Stripe Integration

### Customer Management
- Customers are created on first subscription/trial
- Customer metadata includes:
  - `userId`: Internal user ID
  - `organizationId`: Internal organization ID
  - `organizationName`: Organization name

### Subscription Management
- Uses Stripe's subscription model
- Supports monthly billing
- Handles subscription lifecycle events via webhooks

### Webhook Events Handled
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.trial_will_end`

## Test Mode

### Enabling Test Mode
Add `?testMode=true` to the subscribe page URL:
```
http://localhost:5173/subscribe?testMode=true
```

### Test Mode Behavior
- Simulates subscription and trial flows
- No actual Stripe API calls are made
- Uses test data and mock responses
- Provides visual indicators in the UI

## Error Handling

### Frontend Errors
- Displayed in the UI with clear error messages
- Include detailed error information in development
- Auto-dismiss after a timeout

### API Errors
- Return appropriate HTTP status codes
- Include error details in the response body
- Log detailed error information server-side

## Security Considerations

1. **API Keys**
   - Never expose secret keys in client-side code
   - Use environment variables for sensitive data

2. **Authentication**
   - All subscription endpoints require authentication
   - Session tokens are validated on each request

3. **Data Validation**
   - Validate all input data
   - Use TypeScript for type safety

4. **Rate Limiting**
   - Implement rate limiting on API endpoints
   - Protect against brute force attacks

## Testing

### Test Cards
Use Stripe's test card numbers in test mode:
- Success: `4242 4242 4242 4242`
- Authentication Required: `4000 0025 0000 3155`
- Insufficient Funds: `4000 0000 0000 9995`

### Webhook Testing
Use the Stripe CLI to test webhooks locally:
```bash
stripe listen --forward-to localhost:5173/api/webhook
```

## Current Issues

### 1. Test Mode Authentication Redirect
- **Issue**: In test mode, the application redirects to login when clicking the Subscribe button
- **Location**: `/src/routes/subscribe/+page.svelte`
- **Details**: 
  - The test mode flow in `handleSubscribe()` redirects to `/dashboard?testMode=true&subscribed=true`
  - The dashboard requires authentication, but the test mode flow doesn't ensure the user is logged in
- **Impact**: Users get stuck in a login loop
- **Priority**: High

### 2. Stripe Checkout Error Handling
- **Issue**: Generic error when checkout fails
- **Location**: `/src/routes/api/create-checkout/+server.ts`
- **Details**:
  - Error messages from Stripe API are not properly propagated to the client
  - No specific handling for common errors (e.g., invalid price ID, authentication issues)
- **Impact**: Difficult to debug issues in production
- **Priority**: High

### 3. Environment Variable Loading
- **Issue**: Inconsistent environment variable loading between development and production
- **Location**: `vite.config.ts` and server-side code
- **Details**:
  - Some environment variables are not properly exposed to the client
  - Different naming conventions used (`VITE_` vs. `PUBLIC_` prefixes)
- **Impact**: Configuration issues when deploying to different environments
- **Priority**: Medium

### 4. Session Management
- **Issue**: Session not properly maintained during subscription flow
- **Location**: Authentication middleware and subscription endpoints
- **Details**:
  - Session cookies may not be properly set/validated
  - Race conditions in session initialization
- **Impact**: Users may get logged out during the checkout process
- **Priority**: High

### 5. Error Feedback in UI
- **Issue**: Limited error feedback in the subscription UI
- **Location**: `/src/routes/subscribe/+page.svelte`
- **Details**:
  - Error messages are not user-friendly
  - Loading states could be more informative
- **Impact**: Poor user experience when errors occur
- **Priority**: Medium

## Troubleshooting

### Common Issues
1. **Checkout Fails**
   - Verify Stripe API keys are correct
   - Check browser console for errors
   - Verify the price ID exists in Stripe

2. **Authentication Issues**
   - Ensure user is logged in
   - Check session cookies
   - Verify CORS settings

3. **Webhook Failures**
   - Verify webhook signing secret
   - Check server logs for errors
   - Ensure the webhook endpoint is accessible

## Future Improvements

1. **Subscription Management**
   - Add a customer portal for self-service
   - Support plan upgrades/downgrades
   - Add annual billing option

2. **Analytics**
   - Track subscription metrics
   - Monitor churn rate
   - Analyze usage patterns

3. **Enhanced Testing**
   - Add end-to-end tests
   - Implement contract testing
   - Add performance testing

## Related Documentation

- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [SvelteKit Documentation](https://kit.svelte.dev/)
