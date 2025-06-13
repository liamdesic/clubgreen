# Auth System Architecture

## 1. Core Dependencies
- `@supabase/ssr`: Server-side auth handling
- `@supabase/supabase-js`: Client library
- `zod`: Runtime validation

## 2. Environment Variables
```
PUBLIC_SUPABASE_URL=...
PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...  # Server-side only
```

## 3. Client Initialization
```typescript
// src/lib/supabaseClient.ts
import { createBrowserClient } from '@supabase/ssr'
export const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY)
```

## 4. Server-Side Auth
```typescript
// src/hooks.server.ts
const supabaseHandler: Handle = async ({ event, resolve }) => {
  const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get: (key) => event.cookies.get(key),
      set: (key, value, options) => event.cookies.set(key, value, { ...options, path: '/' }),
      remove: (key, options) => event.cookies.delete(key, { ...options, path: '/' }),
    },
  })
  
  event.locals.supabase = supabase
  event.locals.getUser = async () => (await supabase.auth.getUser()).data.user
  return resolve(event)
}
```

## 5. Auth Flow Endpoints

### 5.1 Login (/login)
- **Methods**: GET, POST
- **Auth**: None
- **Actions**:
  - Email/Password auth
  - Magic link auth
  - Handles redirects post-auth

### 5.2 Auth Callback (/auth/callback)
- **Methods**: GET
- **Auth**: Supabase callback
- **Actions**:
  - Handles OAuth/magic link redirects
  - Verifies session
  - Checks onboarding status
  - Redirects to dashboard/onboarding

### 5.3 Onboarding (/onboarding)
- **Methods**: GET, POST
- **Auth**: Required
- **Actions**:
  - Creates organization
  - Sets up Stripe customer
  - Configures initial settings

### 5.4 Logout Flow
- **Implementation**: Client-side redirect in hooks.server.ts
- **Logic**: Authenticated users accessing /login are redirected to /dashboard
- **Session cleanup**: Handled automatically by Supabase client
- **No explicit logout endpoint**: Logout handled via client-side auth.signOut()

## 6. Protected Routes
```typescript
// src/routes/(protected)/+layout.server.ts
export const load: LayoutServerLoad = async ({ locals }) => {
  const { data: { session } } = await locals.supabase.auth.getSession()
  if (!session) throw redirect(303, '/login')
  return { user: session.user }
}
```

## 7. Session Management
- **Storage**: HTTP-only cookies
- **Refresh**: Handled automatically by Supabase
- **Access Control**: Route guards in layout.server.ts

## 8. Error States
- Invalid sessions → Redirect to /login
- Unverified emails → Show verification message
- Auth errors → Display in UI with retry option

## 9. Security Notes
- Service role key never exposed to client
- All sensitive operations server-side
- Rate limiting via Supabase
- CSRF protection via SameSite cookies
