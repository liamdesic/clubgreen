# Types Rebuild: Deep Dive & Audit

---

## 1. Every Place Types Are Defined in the Codebase

Below is a comprehensive list of every file in the codebase where TypeScript types, interfaces, or type aliases are defined, re-exported, or adapted. This includes all custom types, DB types, validation schemas, and legacy/utility types.

### Core Types & DB Types
- `src/lib/database.types.ts` (auto-generated Supabase types)
- `src/lib/types.ts` (root types file)
- `src/lib/types/leaderboard.ts`
- `src/lib/types/application/leaderboard.ts`
- `src/lib/types/application/settings.ts`
- `src/lib/types/database/index.ts`
- `src/lib/types/event.ts`
- `src/lib/types/score.ts`
- `src/lib/types/index.ts`
- `src/lib/types/stripe.ts`

### Utility & Validation Types
- `src/lib/utils/leaderboard.ts` (utility types, helpers)
- `src/lib/utils/timeFilters.ts` (time range, filter types)
- `src/lib/utils/eventStatus.ts` (event status types)
- `src/lib/utils/viewModes.ts` (view mode types)
- `src/lib/validations.ts` (Zod schemas, validation types)

### Store Types
- `src/lib/stores/LeaderboardStore.ts` (store state, actions, types)
- `src/lib/stores/RotationStore.ts`
- `src/lib/stores/ThemeStore.ts`
- `src/lib/stores/eventStore.ts`
- `src/lib/stores/playerStore.ts`

### Miscellaneous & Third-Party Types
- `src/lib/types/canvas-confetti.d.ts` (ambient, ignore)
- `src/types/leo-profanity.d.ts` (ambient, ignore)
- `src/types/lucide-svelte.d.ts` (ambient, ignore)
- `test/mocks/stripe/types.ts` (test mocks)

### Params & Config
- `src/params/org.ts` (validation, matcher types)
- `src/lib/config.ts` (config constants, may have type defs)

### Other Files (May Contain Inline Types)
- `src/lib/server/stripe/client.ts`
- `src/lib/server/supabaseAdmin.ts`
- `src/lib/server/utils.ts`
- `src/lib/supabaseClient.ts`
- `src/lib/utils/codeUtils.ts`

---

## 2. Deep Analysis of the Types Situation

### A. Duplication & Ambiguity
- Many types (e.g., `Event`, `Organization`, `PlayerScore`, `EventSettings`, `OrganizationSettings`) are defined in multiple files, sometimes with different fields or naming conventions.
- Utility types (for leaderboard logic, time filters, event status) are scattered across several utility files.
- Store files often define their own state and action types, sometimes duplicating core types.
- Validation schemas in `validations.ts` often replicate type shapes instead of referencing canonical types.

### B. DB Coupling & Adaptation
- The auto-generated `database.types.ts` is the single source of truth for DB row shapes, but app types are inconsistently adapted from these.
- Some types are tightly coupled to DB (using snake_case), others use camelCase for app logic, leading to mismatches and confusion.

### C. Legacy & Unused Types
- Several files (e.g., `types.ts`, older utility files) contain types that are no longer actively used but remain in the codebase.
- Some ambient type files are present for third-party or test purposes and can be ignored for the main app.

### D. Validation & Config
- Zod schemas in `validations.ts` are well-structured, but should reference canonical types for field names and structure.
- Config files may define their own type aliases for settings or constants.

---

## 3. Recommendations for a Clean Types Rebuild

### 1. **Centralize All Core Types**
- Create a single canonical types file (e.g., `src/lib/types/models.ts`).
- Define/adapt all core types here: `Event`, `Scorecard`, `Organization`, `PlayerScore`, `EventSettings`, `OrganizationSettings`, etc.
- Adapt DB types from `database.types.ts` at the boundary, and use those everywhere in the app.
- Add clear comments: `// This file is the canonical source for all core app types. Do not duplicate elsewhere.`

### 2. **Remove/Archive All Old Types**
- Delete or archive all legacy type files after extracting any unique logic.
- Update all imports across the codebase to use the new canonical types file.

### 3. **Standardize Naming & Structure**
- Use camelCase for app types, snake_case for DB types (or pick one and stick to it).
- Always use a single `settings_json` object for settings, and type it consistently.

### 4. **Validation & Utilities**
- Ensure Zod schemas reference canonical types for shape and field names.
- Utility files should import types from the canonical file, not define their own.

### 5. **Testing & Maintenance**
- Run all tests and manually check all flows after the migration.
- Document the canonical types file and update onboarding docs for future devs.

---

## 4. Migration Plan (Step-by-Step)
1. **Backup the repo.**
2. **Delete/archive all old types files except `database.types.ts`.**
3. **Create the new canonical types file and define all core types.**
4. **Update all code imports to use the new types.**
5. **Update Zod schemas and utilities to use canonical types.**
6. **Test all flows and fix any issues.**
7. **Document the new types system for future maintainers.**

---

## 5. Appendix: Full List of Type-Defining Files

(See section 1 above for the exhaustive list.)

---

**This document should be used as a reference and checklist for the types rebuild. If you need a starter canonical types file, or want a script to help archive/delete old types files, let me know!**
