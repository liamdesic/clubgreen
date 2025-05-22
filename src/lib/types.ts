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

export interface Organization {
  id: string;
  name: string;
  slug: string;
  // Add other organization properties as needed
}
