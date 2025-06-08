# Project Brief: Leaderboard System Rebuild

---

## Overview

This project is a **full rebuild of the leaderboard system** for the clubgreen platform, aiming for maintainability, extensibility, and 24/7 reliability for venue displays. The rebuild is driven by the need to eliminate technical debt, code duplication, and unclear data flow, while supporting future features with minimal friction.

**This brief is informed by previous audits and migrations:**
- See [`types-rebuild.md`](./types-rebuild.md) for a full audit of type sprawl, duplication, and the plan for a single canonical types file.
- See [`DATABASE_TYPES_MIGRATION.md`](./DATABASE_TYPES_MIGRATION.md) for details on regenerating/updating database types, validation schemas, and remaining integration tasks.

**Key context:**
- The Supabase database types have recently been regenerated and are up-to-date with the schema.
- Validation schemas for events, scorecards, organizations, and settings are now in place.
- The next phase is to eliminate all legacy/duplicate types, integrate new DB types everywhere, and ensure type safety across the codebase.

---

## 1. Objectives & Success Criteria

- **Centralize all leaderboard logic and state** in a single, robust Svelte store, eliminating duplication between components and stores.
- **Thin out and modularize components**: Each UI block (header, score list, QR code, ad banner, etc.) should be a pure, reusable Svelte component.
- **Unify and centralize all types** for leaderboard, events, scores, and organizations, referencing a single canonical types file (see `types-rebuild.md`).
- **Ensure 24/7 reliability**: The `/ob` (organization leaderboard) page must run indefinitely on venue displays, with automatic self-healing (e.g., hard refresh at midnight, auto-reload on error/stale data).
- **Support real-time updates** via Supabase, with fallback to polling if needed.
- **Make it trivial to add new features**: Any new display block should be drop-in, with all required data available from the centralized store.
- **Remove all legacy, unused, or ambiguous code**: No more duplicated or "mystery" props, types, or settings.

---

## 2. Key Requirements

- **Display Reliability**: Must handle 24/7 operation on TVs with no manual interaction (other than a fullscreen button). Self-heal on errors or at scheduled intervals.
- **Real-Time Data**: Use Supabase real-time for score/event updates; fallback to polling if needed.
- **Modular UI**: Leaderboard page is composed of independent blocks (header, scores, QR, ads, etc.), each as a pure Svelte component.
- **Central Store**: All leaderboard/event/org/player data and state is managed in a single store (e.g., `LeaderboardStore`).
- **Unified Types**: All types for events, scores, players, organizations, and settings are defined in a single file and imported everywhere.
- **No Duplicated Logic**: No data fetching, processing, or state logic should be duplicated between components or pages.
- **Easy Extensibility**: New blocks/components can be added with minimal wiring—just drop in and subscribe to the store.
- **Maintainability**: Code should be easy to reason about, test, and extend.

---

## 3. Out of Scope

- No major changes to the scorecard or dashboard flows (other than updating to new types if needed).
- No changes to authentication, onboarding, or payment flows.

---

## 4. Architectural Principles

- **Single source of truth**: All state and types are centralized.
- **Separation of concerns**: Data/state logic in stores, UI in components, types in one place.
- **Minimal bloat**: Only include code that is used and necessary.
- **Self-healing**: Watchdog utility for auto-reload and error recovery.
- **Future-proofing**: Modular, extensible, and easy to maintain.

---

## 5. References
- See `leaderboard-system.md` for the full audit, file list, and detailed critiques of the current system.
- See `types-rebuild.md` for the types audit, migration plan, and canonical types strategy.

---

## 6. Next Steps

1. Complete types centralization and cleanup (see `types-rebuild.md`).
2. Refactor stores and components to use the new types and store structure.
3. Implement the watchdog/self-healing utility for `/ob` display reliability.
4. Modularize the leaderboard UI into independent blocks/components.
5. Remove all legacy, unused, or duplicated code.
6. Test the new system thoroughly in real-world and simulated 24/7 scenarios.

---

**This brief is the guiding document for the leaderboard rebuild. Keep it updated as the project evolves.**
