import type { Tables } from './database.types';

export type Event = Tables<'events'>;
export type Organization = Tables<'organizations'>;

export interface OrganizationSettings {
  logo_url?: string;
  accent_color?: string;
  ad_image_url?: string;
  ad_link?: string;
  billing_email?: string;
  // Add other settings as needed
}
