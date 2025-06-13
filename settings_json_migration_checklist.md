# NOTE

**Use `validations.ts` and `database.types.ts` as the single source of truth (SSOT) for all types and schemas.**

# settings_json Migration Checklist

## What Was Migrated

### Events Table
Previously in `settings_json` | Now Direct Column
---------------------------|----------------
`archived` | `archived` (boolean)
`logo_url` | `logo_url` (string)
`accent_color` | `accent_color` (string)
`ads_image_url` | `ads_image_url` (string)
`ads_text` | `ads_text` (string)
`ads_url` | `ads_url` (string)

### Organizations Table
Previously in `settings_json` | Now Direct Column
---------------------------|----------------
`logo_url` | `logo_url` (string)
`ads_image_url` | `ads_image_url` (string)
`color_palette` | `color_palette` (string[])

**Note**: All code should now reference these fields directly on the event/organization objects instead of through `settings_json`.

---

## Legend
- [ ] **Unchecked**: Needs migration
- [x] **Checked**: Migration complete
- ⚠️ **Niche/Nested**: Unusual or deep usage, review carefully

---

## Migration Targets

### 1. `src/routes/dashboard/[code]/setup/+page.svelte`
- [x] **Update**: Replace all `settings_json` field access and updates with direct columns.
- ⚠️ **Niche**: May use settings_json for org color_palette in local state.

### 2. `src/routes/dashboard/+page.svelte`
- [x] **Update**: Replace all event/org `settings_json` field access, filtering, and updates with direct columns.
- ⚠️ **Niche**: Used in event filtering, store updates, and possibly in derived state.

### 3. `src/routes/dashboard/customize/+page.server.ts`
- [x] **Update**: Replace all org `settings_json` field access and updates with direct columns.

### 4. `src/routes/dashboard/+layout.server.ts`
- [x] **Update**: Update `.select()` to use direct columns instead of `settings_json`.

### 5. `src/routes/dashboard/settings/+page.svelte`
- [x] **Update**: Replace all org `settings_json` field access and updates with direct columns.

### 6. `src/routes/[org]/[event]/leaderboard/+page.svelte.backup`
- [x] **Update**: Replace all event/org `settings_json` field access and updates with direct columns.
- ⚠️ **Niche**: Backup file, but may have legacy or test logic.

### 7. `src/routes/[org]/[code]/+page.svelte`
- [x] **Update**: Replace all event/org `settings_json` field access and updates with direct columns.

### 8. `src/lib/components/scorecard/ScorecardView.svelte`
- [x] **Update**: Replace all event/org `settings_json` field access with direct columns.
- ⚠️ **Niche**: Used for default values and UI display.

### 9. `src/lib/components/leaderboard/LeaderboardHeader.svelte`
- [x] **Update**: Replace all event `settings_json` field access with direct columns.

### 10. `src/lib/components/dashboard/NewRoundModal.svelte`
- [x] **Update**: Replace all event `settings_json` field access and updates with direct columns.

### 11. `src/lib/components/dashboard/DashboardMainHeader.svelte`
- [x] **Update**: Replace all org `settings_json` field access with direct columns.

### 12. `src/lib/components/dashboard/MainLeaderboardCard.svelte`
- [x] **Update**: Replace all event/org `settings_json` field access with direct columns.

### 13. `src/lib/utils/eventStatus.ts`
- [x] **Update**: Replace all event `settings_json` field access with direct columns.

### 14. `src/lib/stores/source/eventSource.ts`
- [x] **Update**: Remove any logic transforming to/from `settings_json` for events.
- ⚠️ **Niche**: May have transformation logic for DB sync.

### 15. `src/lib/components/EventManagement.svelte`
- [x] **Update**: Replace all event `settings_json` field access and updates with direct columns.

### 16. `src/lib/components/NewRoundModal.svelte`
- [x] **Update**: Replace all event `settings_json` field access and updates with direct columns.

### 17. `src/lib/components/MainLeaderboardCard.svelte`
- [x] **Update**: Replace all event/org `settings_json` field access with direct columns.

---

## How to Use
- As you migrate each file, check it off here.
- For niche/nested usages, review logic carefully and test thoroughly.
- When all are checked, the migration is complete! 