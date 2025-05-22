export interface Score {
  id: string;
  player_id: string;
  name: string;
  score: number;
  hole_in_ones: number;
  published: boolean;
  event_id: string;
  created_at: string;
  hole_number?: number;
}
