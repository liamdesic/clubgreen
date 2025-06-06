<script lang="ts">
  import '$lib/styles/EditEvent.css';
  export interface PlayerScore {
    id: string;
    name: string;
    totalScore: number;
    holeInOnes: number;
    published: boolean;
  }
  export let playerScores: PlayerScore[];
  export let onTogglePublished: (id: string) => void;
</script>

<section class="form-block">
  <h2 class="form-block-title">Player Management</h2>
  {#if playerScores.length === 0}
    <div class="empty-state"><p>No players found for this event.</p></div>
  {:else}
    <div class="player-table-container">
      <table class="player-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Score</th>
            <th>Hole-in-Ones</th>
            <th>Visible</th>
          </tr>
        </thead>
        <tbody>
          {#each playerScores as player}
            <tr>
              <td>{player.name}</td>
              <td>{player.totalScore}</td>
              <td>{player.holeInOnes || 0}</td>
              <td>
                <label class="switch">
                  <input type="checkbox" checked={player.published} on:change={() => onTogglePublished(player.id)} />
                  <span class="slider round"></span>
                </label>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section> 