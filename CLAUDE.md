# Club Green Scorecard - Dev Guide

## Tech Stack
- **Frontend**: SvelteKit 2, Svelte 5, TypeScript
- **Backend**: Supabase (PostgreSQL + auth + real-time)  
- **Payments**: Stripe subscriptions
- **Validation**: Zod schemas throughout

## Architecture

### Store Pattern
- **Source stores** (`/src/lib/stores/source/`): Data fetching & Supabase sync
- **View stores** (`/src/lib/stores/view/`): UI state & derived data

### Route Structure
- `/[org]/[code]/` - Scorecard entry (QR code access)
- `/[org]/lb/[shortcode]/` - Public leaderboards  
- `/[org]/ob/[org_code]/` - Organization rotation view
- `/dashboard/` - Protected admin (auth in +layout.server.ts)
- `/api/` - Server endpoints

### Key Patterns

**Supabase SSR**:
```typescript
// Server: hooks.server.ts
const supabase = createServerClient(url, key, {
  cookies: { get, set, remove }
});

// Client
export const supabase = createBrowserClient<Database>(url, key);
```

**Form Actions**:
```typescript
export const actions = {
  default: async ({ request, locals }) => {
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) return fail(400, { errors: result.error.flatten() });
    
    const { error } = await locals.supabase.from('table').insert(result.data);
    if (error) return fail(500, { message: error.message });
    return { success: true };
  }
};
```

## Development

**CRITICAL: Git commit at EVERY checkpoint to enable rollbacks**
- Before making changes: `git commit -m "checkpoint: before [description]"`
- After completing tasks: `git commit -m "feat/fix: [description]"`
- Before major refactors: `git commit -m "checkpoint: before refactor"`

**Area-Specific Documentation**:
- Working on Dashboard? Read `CLAUDE-DASHBOARD.md`
- Working on Leaderboards? Read `CLAUDE-LEADERBOARD.md` 
- Working on Scorecard? Read `CLAUDE-SCORECARD.md`

**Commands**:
- `npm run dev` - Start dev server
- `npm run generate-types` - Generate Supabase types
- `npm run test:e2e` - Playwright tests

**Component Locations**:
- Dashboard: `/src/lib/components/dashboard/`
- Leaderboard: `/src/lib/components/Leaderboard/`
- Validations: `/src/lib/validations/`

## Security
- Organization isolation (all data scoped to org_id)
- Zod validation client + server side
- Profanity filtering with leo-profanity