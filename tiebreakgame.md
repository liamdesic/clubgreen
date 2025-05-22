# Tiebreaker Game Implementation Plan

## Overview
The tiebreaker feature will provide a fair way to break ties between players with identical scores without modifying their actual score values. When two players end with the same score, they'll play a mini-game where they try to stop a timer exactly at zero. The player who gets closest to zero wins the tiebreak.

## Database Changes
- Added `tiebreaker_rank` column (integer, nullable) to the `scorecard` table
- Lower values represent higher ranks (1st place beats 2nd place)
- NULL value indicates no tiebreaker has been played

## Components to Create

### 1. TiebreakModal.svelte
A modal component that will:
- Display the tied players' names with a "VS" between them
- Show the game instructions
- Host the timer game UI
- Handle player turns and determine the winner

## Implementation Steps

### Phase 1: Detecting Ties

1. Modify the final scores screen to detect when two or more players have the same score
2. Add a "Tiebreaker" button when ties are detected
3. Pass the tied players' information to the tiebreaker modal

```svelte
<!-- Example code for detecting ties in final scores -->
{#if detectTies(players).length > 0}
  <div class="tiebreaker-section">
    <p>{tiedPlayers[0].name} & {tiedPlayers[1].name} got the same score!</p>
    <button on:click={() => openTiebreaker(tiedPlayers)}>Tiebreak</button>
  </div>
{/if}
```

### Phase 2: Tiebreaker Modal Creation

1. Create the modal component with these sections:
   - Header with players' names and "VS" display
   - Game instructions
   - Timer display
   - Start/Stop button
   - Results display

2. Style the modal to make it visually appealing with:
   - Boxing glove icon behind the VS
   - Large countdown timer
   - Clear instructions
   - Responsive design for all device sizes

### Phase 3: Game Logic

1. Implement the countdown timer:
   - Start at +5 seconds
   - Count down to -5 seconds (or stop when player presses button)
   - Calculate how close the stopped time is to 0.00

2. Handle player turns:
   - First player plays
   - Store their score
   - Second player plays
   - Compare scores to determine winner

3. Update database with tiebreaker results:
   - Winner gets tiebreaker_rank = 1
   - Loser gets tiebreaker_rank = 2

```js
// Example tiebreaker logic
async function updateTiebreakerResults(winnerId, loserId) {
  // Update winner with rank 1
  await supabase
    .from('scorecard')
    .update({ tiebreaker_rank: 1 })
    .eq('player_id', winnerId)
    .eq('event_id', currentEventId);
    
  // Update loser with rank 2
  await supabase
    .from('scorecard')
    .update({ tiebreaker_rank: 2 })
    .eq('player_id', loserId)
    .eq('event_id', currentEventId);
}
```

### Phase 4: Leaderboard Integration

1. Modify the leaderboard to sort by tiebreaker_rank when scores are tied:

```js
// Sorting logic with tiebreaker support
leaderboard = Array.from(playerMap.values())
  .filter(player => holesPlayed[player.id] === eventSettings.hole_count)
  .sort((a, b) => {
    // Primary sort by score
    const scoreCompare = a.totalScore - b.totalScore;
    if (scoreCompare !== 0) return scoreCompare;
    
    // If scores are tied, use tiebreaker rank
    if (a.tiebreaker_rank !== null && b.tiebreaker_rank !== null) {
      return a.tiebreaker_rank - b.tiebreaker_rank;
    }
    
    // If only one has a tiebreaker rank, they win the tie
    if (a.tiebreaker_rank !== null) return -1;
    if (b.tiebreaker_rank !== null) return 1;
    
    // If no tiebreakers, keep original order
    return 0;
  });
```

2. Add visual indicators for tiebreaker winners in the UI (optional):
   - Add a small trophy or "TB" icon next to the player who won a tiebreaker
   - Use CSS to highlight tiebreaker winners

## Required Libraries
- No additional libraries needed
- Uses existing Supabase for database updates
- Uses SvelteKit for component creation and reactivity

## UI/UX Considerations
1. **Clear Instructions**: Ensure players understand the goal is to stop at exactly 0.00
2. **Visual Feedback**: Show how close each player got to zero
3. **Exciting Design**: Make the tiebreaker feel like an event with animations and sound effects (optional)
4. **Accessibility**: Ensure the game is playable by all users, including those with disabilities

## Testing Plan
1. Test tie detection with multiple tied players
2. Test the timer accuracy and stopping mechanism
3. Test the winner determination logic
4. Verify database updates work correctly
5. Test the leaderboard sorting with tiebreaker ranks
6. Test edge cases (3+ way ties, etc.)

## Future Enhancements
1. Support for breaking ties between 3+ players
2. Different tiebreaker game options
3. Tiebreaker statistics tracking
4. Animated celebrations for the winner

## Task Checklist
- [ ] Add tiebreaker_rank column to Supabase scorecard table
- [ ] Create TiebreakModal.svelte component
- [ ] Implement tie detection in the final scores screen
- [ ] Build countdown timer logic
- [ ] Implement player turn management
- [ ] Add database update functions for tiebreaker results
- [ ] Update leaderboard sorting to respect tiebreaker ranks
- [ ] Add visual indicators for tiebreaker winners
- [ ] Test thoroughly across different devices
- [ ] Document the feature for users
