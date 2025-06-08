# Supabase Schema Updates

This file tracks all structural changes, migrations, and recommendations for keeping the database schema DRY and maintainable. Each entry should include rationale and, where relevant, SQL or migration instructions.

---

## Proposed Updates (2025-06-08)

### 1. Add `game_id` to `scorecard` Table
- **Why:** Allows grouping multiple score rows as a single game session (multi-player, analytics, etc.).
- **SQL:**
```sql
ALTER TABLE scorecard ADD COLUMN game_id uuid NULL;
```

### 2. Unify Event Time Filters
- **Why:** Remove `score_time_range` and `additional_time_filters` from `settings_json` and replace with a single `time_filters` array.
- **SQL:**
No direct SQL needed (JSON structure change), but update app logic and migrations to rewrite settings JSON.

### 3. Remove `event_type` from `settings_json`
- **Why:** Can be derived from `event_date` (NULL = 'ongoing', else 'single').
- **SQL:**
No direct SQL needed. Remove from app types and logic.

### 4. Audit and Promote Core Fields out of `settings_json`
- **Why:** For any value that is always required, frequently queried, or performance-critical, make it a real column. This improves type safety, performance, and maintainability.

#### Candidates for Promotion (with SQL):

**events**
- `hole_count` (integer): Number of holes in the event.
- `accent_color` (text): Theme color for event branding.
- `logo_url` (text): Event-specific logo.
- `show_on_main_leaderboard` (boolean): Controls event visibility.
- `archived` (boolean): Soft-delete/archive flag.
- `ads_text`, `ads_url`, `ads_image_url` (text): Event-specific ad content.
- `time_filters` (jsonb or text[]): Unified time filter options for event.

```sql
ALTER TABLE events
  ADD COLUMN hole_count integer NULL,
  ADD COLUMN accent_color text NULL,
  ADD COLUMN logo_url text NULL,
  ADD COLUMN show_on_main_leaderboard boolean NULL,
  ADD COLUMN archived boolean NULL,
  ADD COLUMN ads_text text NULL,
  ADD COLUMN ads_url text NULL,
  ADD COLUMN ads_image_url text NULL,
  ADD COLUMN time_filters jsonb NULL;
```

**organizations**
- `logo_url` (text): Org branding.
- `color_palette` (jsonb or text[]): Org theme colors.
- `billing_email` (text): For invoicing/Stripe.
- `ad_image_url` (text): Org-level ad content.

```sql
ALTER TABLE organizations
  ADD COLUMN logo_url text NULL,
  ADD COLUMN color_palette jsonb NULL,
  ADD COLUMN billing_email text NULL,
  ADD COLUMN ad_image_url text NULL;
```

**scorecard**
- `game_id` (uuid): Group scores by game session.
- `published` (boolean): For moderation/staged results.

```sql
ALTER TABLE scorecard
  ADD COLUMN game_id uuid NULL,
  ADD COLUMN published boolean NULL;
```

---

### 5. Review Other Tables
- `event_logs`: Used for admin/audit. No obvious columns to promote yet, but as you add tracked events, consider adding columns for commonly queried fields.
- `stripe_customers`, etc.: No obvious candidates for promotion out of JSON at this time, but review as app evolves.

---

## Notes
- Only use `settings_json` for truly flexible, optional, or experimental settings.
- Promote any setting that is core to logic, validation, or performance to a real column.
- Adding nullable columns now is non-breaking and future-proofs your schema.
- Keep this file up to date with all schema changes and rationale.

---

## SQL MIGRATIONS FOR ALL CHANGES

### EVENTS TABLE
```sql
ALTER TABLE events
  ADD COLUMN hole_count integer NULL,
  ADD COLUMN accent_color text NULL,
  ADD COLUMN logo_url text NULL,
  ADD COLUMN show_on_main_leaderboard boolean NULL,
  ADD COLUMN archived boolean NULL,
  ADD COLUMN ads_text text NULL,
  ADD COLUMN ads_url text NULL,
  ADD COLUMN ads_image_url text NULL,
  ADD COLUMN time_filters jsonb NULL;
```

### ORGANIZATIONS TABLE
```sql
ALTER TABLE organizations
  ADD COLUMN logo_url text NULL,
  ADD COLUMN color_palette jsonb NULL,
  ADD COLUMN billing_email text NULL,
  ADD COLUMN ads_image_url text NULL;
```

### SCORECARD TABLE
```sql
ALTER TABLE scorecard
  ADD COLUMN game_id uuid NULL,
  ADD COLUMN published boolean NULL;
```
