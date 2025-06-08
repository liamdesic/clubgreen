# Source Stores Rebuild Plan (Hybrid, Table-Aligned, Real-World Ready)

## Overview
This document outlines the plan for rebuilding all source (table-aligned) stores in the ldrboard app using a pragmatic, scalable, and real-world approach. This hybrid pattern combines the clarity of table-aligned stores with the performance and UX benefits of feature/view stores.

---

## 1. Core Principles
- **Table-aligned, session-scoped:** Each source store represents a slice of a Supabase table, scoped to the current org/event/session—not the entire table.
- **Single source of truth:** All CRUD for a data domain goes through its source store.
- **No business logic:** Source stores only fetch, cache, and update raw rows. All aggregation, grouping, and presentation logic lives in utils or view stores.
- **Validation first:** All rows are validated (with Zod) on arrival—downstream code never checks for nulls or malformed data.
- **Offline/optimistic ready:** Source stores can queue writes for offline/unstable connections.
- **Status mini-stores:** Each source store exports `{ loading, error }` for consistent UX.

---

## 2. Proposed Source Stores

### a. `orgSource`
- **Holds:** Current org row (and settings)
- **Methods:** `fetchOrg`, `updateOrg`, `setOrgSettings`
- **Status:** `{ loading, error }`

### b. `eventSource`
- **Holds:** All events for current org (optionally scoped by date, published, etc.)
- **Methods:** `fetchEvents`, `addEvent`, `updateEvent`, `subscribeToEvent`
- **Status:** `{ loading, error }`

### c. `scoresSource`
- **Holds:** Scorecard rows for current event (or scoped set)
- **Methods:** `fetchScores(eventId)`, `addScore`, `updateScore`, `subscribeToEventScores(eventId)`, `flushPending()`
- **Offline:** `pendingWrites`, auto-flush on reconnect
- **Status:** `{ loading, error }`

---

## 3. Key Tasks & Enhancements

### ✅ Validation Helpers
- Use existing Zod schemas to validate all incoming rows before storing.
- Add type guards for any complex or nested fields.

### ✅ Write Queue & Offline Support
- Add `pendingWrites` array in `scoresSource`.
- Implement `flushPending()` and auto-flush on `navigator.onLine`.
- Queue writes when offline, flush when back online.

### ✅ Status Mini-Stores
- Each source store exports `{ loading, error }` writable stores.
- Pages/components subscribe for consistent spinners, error toasts, etc.

### ✅ Real-Time Subscriptions (Scoped)
- Only subscribe to rows relevant to the current org/event/session.
- Unsubscribe and clear memory when not needed (e.g., page unmounts).

### ✅ ESLint Dependency Boundaries
- Enforce: Types → Source Stores → View Stores → Components → Pages.
- No upwards/circular imports (use `eslint-plugin-boundaries`).

### ✅ Unit Tests for Utils
- Ensure all utils (grouping, ranking, etc.) are pure and covered by Vitest.

---

## 4. Example: scoresSource.ts
```ts
import { writable } from 'svelte/store';
import { supabase } from '$lib/supabaseClient';
import { ScorecardSchema } from '$lib/validations';

function createScoresSource() {
  const { subscribe, set, update } = writable([]);
  const loading = writable(false);
  const error = writable(null);
  const pendingWrites = writable([]);
  let subscription = null;

  async function fetchScores(eventId) {
    loading.set(true);
    const { data, error: err } = await supabase
      .from('scorecard')
      .select('*')
      .eq('event_id', eventId);
    if (err) { error.set(err.message); loading.set(false); return; }
    const validRows = (data ?? []).filter(row => ScorecardSchema.safeParse(row).success);
    set(validRows);
    loading.set(false);
  }

  // ... (add subscribeToEventScores, addScore, flushPending, etc.)

  return { subscribe, fetchScores, loading, error, pendingWrites };
}

export const scoresSource = createScoresSource();
```

---

## 5. Next Steps Checklist
- [ ] Audit all current stores: mark each as source, view, or util; remove overlap.
- [ ] Create `/lib/stores/source/` and move table-aligned stores there.
- [ ] Add validation on all fetch/subscribe methods.
- [ ] Implement write queue + offline support in scoresSource.
- [ ] Add `{ loading, error }` to each source store.
- [ ] Add ESLint boundaries config.
- [ ] Ensure all utils have Vitest tests.

---

## Bottom Line

This approach gives you:
- Clarity and maintainability (no overlap, no drift)
- Performance (scoped fetches, no wasted reactivity)
- Resilience (offline/optimistic support)
- A rock-solid foundation for all future features

**Ready to start scaffolding these stores or want code for a specific one? Just ask!**
