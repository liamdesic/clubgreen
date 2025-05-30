export interface Event {
  id: string;
  title: string;
  slug: string;
  event_date: string | null;
  organization_id: string;
  created_at: string;
  updated_at?: string;
  // Add other event properties as needed
}

export interface OrganizationSettings {
  logo_url?: string;
  accent_color?: string;
  ad_image_url?: string;
  ad_link?: string;
  billing_email?: string;
  // Add other settings as needed
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  trial_ends_at?: string | null;
  subscription_status?: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  settings_json?: OrganizationSettings;
  created_at?: string;
  updated_at?: string;
}
