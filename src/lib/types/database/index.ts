import type { Database, Tables, TablesInsert, TablesUpdate } from '$lib/database.types';
import type { EventSettings, OrganizationSettings } from '../application/settings';

// Re-export the main database type
export type { Database };

// Re-export table types with proper JSON typing
export type Event = Omit<Tables<'events'>, 'settings_json'> & {
  settings_json: EventSettings['settings_json'];
  updated_at?: string | null;
};

export type EventInsert = Omit<TablesInsert<'events'>, 'settings_json'> & {
  settings_json?: EventSettings['settings_json'];
  updated_at?: string | null;
};

export type EventUpdate = Omit<TablesUpdate<'events'>, 'settings_json'> & {
  settings_json?: EventSettings['settings_json'];
  updated_at?: string | null;
};

export type Organization = Omit<Tables<'organizations'>, 'settings_json'> & {
  settings_json: OrganizationSettings['settings_json'];
};

export type OrganizationInsert = Omit<TablesInsert<'organizations'>, 'settings_json'> & {
  settings_json?: OrganizationSettings['settings_json'];
};

export type OrganizationUpdate = Omit<TablesUpdate<'organizations'>, 'settings_json'> & {
  settings_json?: OrganizationSettings['settings_json'];
};

export type Score = Tables<'scorecard'>;
export type ScoreInsert = TablesInsert<'scorecard'>;
export type ScoreUpdate = TablesUpdate<'scorecard'>; 