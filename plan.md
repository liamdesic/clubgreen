# Dashboard Pages Implementation Plan

## Overview
We need to implement 4 dashboard pages with consistent design and functionality:
1. Org Settings - Edit organizations table
2. Event Setup - Edit events table
3. Customize - Edit organizations table (appearance settings)
4. Manage Players - View and manage leaderboard_snapshot players

## Common Patterns & Components

### 1. Base Layout Components
- `DashboardFormLayout.svelte`
  - Common header with breadcrumbs
  - Loading/error states
  - Toast notifications
  - Consistent styling
  - Props:
    ```typescript
    {
      title: string;
      subtitle?: string;
      loading?: boolean;
      error?: string;
      organization: Organization;
    }
    ```

### 2. Form Components
- `AutoSaveForm.svelte` (Base form component)
  - Auto-save on change
  - Toast notifications
  - Loading states
  - Error handling
  - Props:
    ```typescript
    {
      initialData: T;
      onSave: (data: T) => Promise<void>;
      validate: (data: T) => boolean;
      loading?: boolean;
    }
    ```

### 3. Form Fields
- `FormField.svelte` (Reusable form field)
  - Label
  - Input/select/textarea
  - Error message
  - Loading state
  - Props:
    ```typescript
    {
      label: string;
      name: string;
      type: 'text' | 'select' | 'textarea' | 'color' | 'date';
      value: any;
      options?: { label: string; value: any }[];
      error?: string;
      loading?: boolean;
    }
    ```

## Page-Specific Implementation

### 1. Org Settings (`/dashboard/settings`)
- Form fields based on `organizationSchema`:
  - Name
  - Slug
  - Billing Email
  - Logo URL
  - Color Palette
  - Leaderboard Rotation Interval
- Uses `orgSource` for data management
- Auto-saves changes
- Shows toast notifications

### 2. Event Setup (`/dashboard/events/[code]/setup`)
- Form fields based on `eventSchema`:
  - Title
  - Event Date
  - Hole Count
  - Accent Color
  - Logo URL
  - Show on Main Leaderboard
  - Time Filters
  - Ads Settings
- Uses `eventSource` for data management
- Auto-saves changes
- Shows toast notifications

### 3. Customize (`/dashboard/customize`)
- Form fields for appearance settings:
  - Logo Upload
  - Color Palette
  - Ads Image
  - Leaderboard Settings
- Uses `orgSource` for data management
- Auto-saves changes
- Shows toast notifications

### 4. Manage Players (`/dashboard/events/[code]/players`)
- Table view of players from leaderboard_snapshot
- Actions:
  - Unpublish player
  - Trigger edge function for recalculation
- Uses `scoresSource` for data management
- Shows toast notifications

## Implementation Order

1. Base Components
   - Create `DashboardFormLayout.svelte`
   - Create `AutoSaveForm.svelte`
   - Create `FormField.svelte`

2. Org Settings
   - Implement form with organization fields
   - Add validation
   - Connect to `orgSource`

3. Event Setup
   - Implement form with event fields
   - Add validation
   - Connect to `eventSource`

4. Customize
   - Implement form with appearance fields
   - Add validation
   - Connect to `orgSource`

## Technical Considerations

### Data Flow
- All pages use source stores for data management
- No direct Supabase calls in components
- Validation using Zod schemas
- Type safety throughout

### Error Handling
- Form validation errors
- API errors
- Network errors
- Toast notifications for all errors

### Performance
- Debounced auto-save
- Optimistic updates
- Efficient re-renders

### Accessibility
- ARIA labels
- Keyboard navigation
- Focus management
- Error announcements

## Testing Strategy

1. Unit Tests
   - Form validation
   - Data transformations
   - Error handling

2. Integration Tests
   - Form submission
   - Auto-save functionality
   - Error scenarios

3. E2E Tests
   - User flows
   - Error recovery
   - Data persistence

## Documentation

1. Component Documentation
   - Props
   - Events
   - Usage examples

2. Page Documentation
   - Features
   - Data flow
   - Error handling

3. API Documentation
   - Source store methods
   - Validation schemas
   - Type definitions 