// Define the view modes for the dispatcher
export enum ViewMode {
  SCORECARD = 'scorecard',
  EVENT_LEADERBOARD = 'event_leaderboard',
  ORG_LEADERBOARD = 'org_leaderboard',
}

// Map view modes to their corresponding CSS files
// This centralizes the mapping and makes it easier to maintain
export const MODE_CSS = {
  [ViewMode.SCORECARD]: 'scorecard.css',
  [ViewMode.EVENT_LEADERBOARD]: 'leaderboard.css',
  [ViewMode.ORG_LEADERBOARD]: 'leaderboard.css',
};
