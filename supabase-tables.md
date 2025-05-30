# 🗃️ Database Schema

*Last updated: 2025-05-30*

## 📋 Table of Contents
- [Events](#-events)
- [Organizations](#-organizations)
- [Scorecard](#-scorecard)
- [Subscriptions](#-subscriptions)

---

## 🎯 Events
*Stores tournament and event information*

### 🔑 Primary Key
- `id` (uuid)

### ➕ Columns
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | ❌ | `gen_random_uuid()` | Unique identifier |
| organization_id | uuid | ✅ |  | References `organizations.id` |
| title | text | ❌ |  | Event name |
| slug | text | ❌ |  | URL-friendly identifier |
| event_date | date | ✅ | `CURRENT_DATE` | Scheduled date |
| settings_json | jsonb | ✅ | `{}` | Additional settings |
| published | boolean | ✅ | `false` | Publication status |
| created_at | timestamptz | ✅ | `timezone('utc', now())` | Creation timestamp |

### 🔒 Row Level Security
- **Status**: ❌ Disabled
- **Policies**: None

---

## 🏢 Organizations
*Organization information and settings*

### 🔑 Primary Key
- `id` (uuid)

### ➕ Columns
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | ❌ | `gen_random_uuid()` | Unique identifier |
| name | text | ❌ |  | Organization name |
| slug | text | ❌ |  | URL-friendly identifier |
| owner_id | uuid | ✅ |  | References `users.id` |
| created_at | timestamptz | ✅ | `timezone('utc', now())` | Creation timestamp |
| settings_json | jsonb | ✅ | `{}` | Organization settings |
| updated_at | timestamptz | ✅ | `now()` | Last update timestamp |
| stripe_customer_id | text | ✅ |  | Stripe customer ID |
| stripe_subscription_id | text | ✅ |  | Stripe subscription ID |
| subscription_status | text | ✅ |  | Current subscription status |
| current_period_end | timestamptz | ✅ |  | End of current billing period |
| trial_ends_at | timestamptz | ✅ |  | End of trial period |
| payment_up_to_date | boolean | ❌ | `true` | Payment status |

### 🔒 Row Level Security
- **Status**: ✅ Enabled
- **Policies**:
  - **Organization owners can update payment status**
    - **Type**: UPDATE
    - **Roles**: public
    - **Condition**: `(owner_id = auth.uid())`

---

## 🏌️ Scorecard
*Player scorecards and game data*

### 🔑 Primary Key
- `id` (uuid)

### ➕ Columns
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | ❌ | `gen_random_uuid()` | Unique identifier |
| name | text | ❌ |  | Player name |
| score | integer | ❌ |  | Total score |
| hole_in_ones | integer | ✅ | `0` | Number of hole-in-ones |
| created_at | timestamptz | ✅ | `timezone('utc', now())` | Creation timestamp |
| hole_number | integer | ✅ |  | Current hole number |
| player_id | uuid | ✅ |  | Player identifier |
| published | boolean | ✅ | `true` | Publication status |
| event_id | uuid | ✅ |  | References `events.id` |
| tiebreaker_rank | integer | ✅ |  | Tiebreaker ranking |

### 🔒 Row Level Security
- **Status**: ✅ Enabled
- **Policies**:
  - **Enable read access for all users**
    - **Type**: SELECT
    - **Condition**: `EXISTS (SELECT 1 FROM events WHERE events.id = scorecard.event_id)`
  
  - **Enable insert for authenticated users only**
    - **Type**: INSERT
    - **Role**: authenticated
    - **Check**: `EXISTS (SELECT 1 FROM events WHERE events.id = scorecard.event_id)`
  
  - **Enable update for users based on email**
    - **Type**: UPDATE
    - **Role**: authenticated
    - **Condition**: User is organization owner
  
  - **Enable delete for users based on email**
    - **Type**: DELETE
    - **Role**: authenticated
    - **Condition**: User is organization owner

---

## 💳 Subscriptions
*Subscription and billing information*

### 🔑 Primary Key
- `id` (uuid)

### ➕ Columns
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | ❌ | `uuid_generate_v4()` | Unique identifier |
| organization_id | uuid | ❌ |  | References `organizations.id` |
| stripe_customer_id | text | ❌ |  | Stripe customer ID |
| stripe_subscription_id | text | ✅ |  | Stripe subscription ID |
| status | text | ❌ |  | Subscription status |
| current_period_end | timestamptz | ✅ |  | End of current billing period |
| trial_ends_at | timestamptz | ❌ |  | End of trial period |
| created_at | timestamptz | ❌ | `now()` | Creation timestamp |
| updated_at | timestamptz | ❌ | `now()` | Last update timestamp |

### 🔒 Row Level Security
- **Status**: ✅ Enabled
- **Policies**:
  - **Users can view their organization's subscription**
    - **Type**: SELECT
    - **Condition**: User is organization owner
  
  - **Organization owners can create subscriptions**
    - **Type**: INSERT
    - **Check**: User is organization owner
  
  - **Organization owners can update their subscription**
    - **Type**: UPDATE
    - **Condition**: User is organization owner

  - **Service role can manage subscriptions**
    - **Type**: ALL
    - **Condition**: `auth.role() = 'service_role'`

---

*Documentation generated automatically. Update this file when making schema changes.*
