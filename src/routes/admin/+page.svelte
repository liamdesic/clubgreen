<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import '../../lib/admin.css';

  // Form state
  let holeCount = 4;
  let eventTitle = 'Live Leaderboard';
  let showHoleInOnes = true;
  let leaderboardMode = 'live';
  let timeFilter = 'all_time';
  let logoUrl = '';
  let adImageUrl = '';
  let qrImageUrl = '';
  let accentColor = '#3FB549';
  let enableAds = false;
  let adsText = '';
  let pinTopPlayer = true;
  let maxPlayersVisible = 100;
  let published = true;
  let settingsId = null;
  let playerScores = [];
  let modifiedScores = new Map();
  let unsavedChanges = false;

  // File refs
  let logoFile, adFile, qrFile;

  // Upload status and size
  let logoStatus = '', logoSize = 0;
  let adStatus = '', adSize = 0;
  let qrStatus = '', qrSize = 0;

  let loading = true;
  let error = null;

  async function loadSettings() {
    const { data, error: settingsError } = await supabase
      .from('leaderboard_settings')
      .select('*')
      .limit(1)
      .single();

    if (settingsError) {
      error = settingsError.message;
      return;
    }

    settingsId = data.id;
    holeCount = data.hole_count ?? 4;
    eventTitle = data.event_name;
    showHoleInOnes = data.show_hole_in_ones;
    leaderboardMode = data.leaderboard_mode;
    timeFilter = data.time_filter;
    logoUrl = data.logo_url;
    adImageUrl = data.ads_url;
    qrImageUrl = data.qr_image_url;
    accentColor = data.accent_color;
    enableAds = data.enable_ads;
    adsText = data.ads_text;
    pinTopPlayer = data.pin_top_player;
    maxPlayersVisible = data.max_players_visible;
    published = data.published;
  }

  async function loadPlayerScores() {
    const { data, error } = await supabase
      .from('scorecard')
      .select('player_id, name, score, hole_in_ones, published')
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Failed to load scores:', error.message);
      return;
    }

    const playerMap = new Map();

    for (const row of data) {
      const id = row.player_id || row.name;
      if (!playerMap.has(id)) {
        playerMap.set(id, {
          id,
          name: row.name,
          totalScore: 0,
          holeInOnes: 0,
          published: row.published
        });
      }

      const player = playerMap.get(id);
      player.totalScore += row.score ?? 0;
      player.holeInOnes += row.hole_in_ones ?? 0;
    }

    playerScores = Array.from(playerMap.values());
  }

 function togglePublishedLocally(playerId) {
  const index = playerScores.findIndex(p => p.id === playerId);
  if (index === -1) return;

  // Create a new player object with the toggled published value
  const updatedPlayer = {
    ...playerScores[index],
    published: !playerScores[index].published
  };

  // Reassign the array with the updated player
  playerScores = [
    ...playerScores.slice(0, index),
    updatedPlayer,
    ...playerScores.slice(index + 1)
  ];

  // Track the change
  modifiedScores.set(playerId, updatedPlayer.published);
  unsavedChanges = true;
}

  async function uploadFileToSupabase(file, folder) {
    const filename = `${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('public-assets')
      .upload(`${folder}/${filename}`, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data } = supabase.storage
      .from('public-assets')
      .getPublicUrl(`${folder}/${filename}`);

    return data.publicUrl;
  }

  async function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    logoFile = file;
    logoSize = (file.size / 1024).toFixed(1);
    logoStatus = 'uploading';

    try {
      logoUrl = await uploadFileToSupabase(file, 'logos');
      logoStatus = 'uploaded';
    } catch (err) {
      logoStatus = 'error';
      console.error('Logo upload failed:', err.message);
    }
  }

  async function handleAdUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    adFile = file;
    adSize = (file.size / 1024).toFixed(1);
    adStatus = 'uploading';

    try {
      adImageUrl = await uploadFileToSupabase(file, 'ads');
      adStatus = 'uploaded';
    } catch (err) {
      adStatus = 'error';
      console.error('Ad upload failed:', err.message);
    }
  }

  async function handleQrUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    qrFile = file;
    qrSize = (file.size / 1024).toFixed(1);
    qrStatus = 'uploading';

    try {
      qrImageUrl = await uploadFileToSupabase(file, 'qr-codes');
      qrStatus = 'uploaded';
    } catch (err) {
      qrStatus = 'error';
      console.error('QR upload failed:', err.message);
    }
  }

  function resetLogo() {
    logoFile = null;
    logoUrl = '';
    logoStatus = '';
    logoSize = 0;
  }

  function resetAd() {
    adFile = null;
    adImageUrl = '';
    adStatus = '';
    adSize = 0;
  }

  function resetQr() {
    qrFile = null;
    qrImageUrl = '';
    qrStatus = '';
    qrSize = 0;
  }

  async function saveSettings() {
    if (!settingsId) return alert('Settings ID not loaded');

    try {
      if (logoFile) logoUrl = await uploadFileToSupabase(logoFile, 'logos');
      if (adFile) adImageUrl = await uploadFileToSupabase(adFile, 'ads');
      if (qrFile) qrImageUrl = await uploadFileToSupabase(qrFile, 'qr-codes');

      const { error: updateError } = await supabase
        .from('leaderboard_settings')
        .update({
          hole_count: holeCount,
          event_name: eventTitle,
          show_hole_in_ones: showHoleInOnes,
          leaderboard_mode: leaderboardMode,
          time_filter: timeFilter,
          logo_url: logoUrl,
          ads_url: adImageUrl,
          qr_image_url: qrImageUrl,
          accent_color: accentColor,
          enable_ads: enableAds,
          ads_text: adsText,
          pin_top_player: pinTopPlayer,
          max_players_visible: maxPlayersVisible,
          published
        })
        .eq('id', settingsId);

      if (updateError) throw updateError;

      // Save any visibility changes to scorecard
      for (const [playerId, newStatus] of modifiedScores.entries()) {
        const { error: scoreError } = await supabase
          .from('scorecard')
          .update({ published: newStatus })
          .eq('player_id', playerId);

        if (scoreError) {
          console.error(`❌ Failed to update visibility for player ${playerId}:`, scoreError.message);
        }
      }

      modifiedScores.clear();
      unsavedChanges = false;
      await loadPlayerScores();

      alert('✅ Settings updated!');
      error = null;
    } catch (err) {
      error = err.message;
    }
  }

  onMount(() => {
    loadSettings();
    loadPlayerScores();
    loading = false;
  });
</script>



<form on:submit|preventDefault={saveSettings} class="admin-form">

  <!-- 📘 Event Info -->
  <div class="form-section">
    <h1 style="text-align: center;"> Club Green Admin </h1>
    <label>
      Event Name:
      <input type="text" bind:value={eventTitle} />
    </label>

    <label>
      Number of Holes:
      <input type="number" min="1" max="18" bind:value={holeCount} />
    </label>
  </div>

  <!-- 🏁 Display Settings -->
  <div class="form-section">
    <label>
      Show Holes-in-One?
      <input type="checkbox" bind:checked={showHoleInOnes} />
    </label>

    <label>
      Accent Color:
      <input type="color" bind:value={accentColor} />
    </label>
  </div>

 <div class="form-section">
   <label>
      Time Filter:
      <select bind:value={timeFilter}>
        <option value="last_hour">Last Hour</option>
        <option value="today">Today</option>
        <option value="all_time">All Time</option>
      </select>
    </label>
  </div>


<!-- 🖼️ Logo Upload -->
<div class="form-section">
  <label>
    Upload Logo:
    <input type="file" on:change={handleLogoUpload} />
  </label>

  {#if logoStatus === 'uploading'}
    <p class="status uploading">Uploading logo...</p>
  {:else if logoStatus === 'uploaded'}
    <p class="status uploaded">✅ Logo uploaded ({logoSize} KB)</p>
  {:else if logoStatus === 'error'}
    <p class="status error">❌ Logo upload failed</p>
  {/if}

  {#if logoUrl}
    <div class="preview">
      <img src={logoUrl} alt="Logo Preview" height="80" />
      <button type="button" on:click={resetLogo}>Remove Logo</button>
    </div>
  {/if}
</div>

<!-- 🧾 Ad Image Upload -->
<div class="form-section">
  <label>
    Upload Ad Image:
    <input type="file" on:change={handleAdUpload} />
  </label>

  {#if adStatus === 'uploading'}
    <p class="status uploading">Uploading ad...</p>
  {:else if adStatus === 'uploaded'}
    <p class="status uploaded">✅ Ad uploaded ({adSize} KB)</p>
  {:else if adStatus === 'error'}
    <p class="status error">❌ Ad upload failed</p>
  {/if}

  {#if adImageUrl}
    <div class="preview">
      <img src={adImageUrl} alt="Ad Preview" height="80" />
      <button type="button" on:click={resetAd}>Remove Ad</button>
    </div>
  {/if}
</div>

<!-- 📱 QR Code Upload -->
<div class="form-section">
  <label>
    Upload QR Code Image:
    <input type="file" on:change={handleQrUpload} />
  </label>

  {#if qrStatus === 'uploading'}
    <p class="status uploading">Uploading QR code...</p>
  {:else if qrStatus === 'uploaded'}
    <p class="status uploaded">✅ QR uploaded ({qrSize} KB)</p>
  {:else if qrStatus === 'error'}
    <p class="status error">❌ QR upload failed</p>
  {/if}

  {#if qrImageUrl}
    <div class="preview">
      <img src={qrImageUrl} alt="QR Preview" height="80" />
      <button type="button" on:click={resetQr}>Remove QR</button>
    </div>
  {/if}
</div>

<h2>🎯 Leaderboard Entries</h2>
<div class="score-list-wrapper">

<table class="leaderboard-table">
  <thead>
    <tr>
      <th>Player</th>
      <th>Score</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    {#each playerScores as player}
      <tr class:modified-row={modifiedScores.has(player.id)}>
        <td>{player.name}</td>
        <td>{player.totalScore}</td>
        <td>
    <div
      class="toggle-switch"
      class:on={player.published}
      on:click={() => togglePublishedLocally(player.id)}
      title={player.published ? 'Visible' : 'Hidden'}>
    </div>
  </td>
</tr>


    {/each}
  </tbody>
</table>
</div>



  <!-- 💤 Deprecated or unused — hidden for now -->
  <div class="form-section" style="display: none;">
    <label>
      Leaderboard Mode:
      <select bind:value={leaderboardMode}>
        <option value="live">Live</option>
        <option value="final_only">Final Only</option>
        <option value="top_10">Top 10</option>
        <option value="all">All Players</option>
      </select>
    </label>

   
    <label>
      Pin Top Player:
      <input type="checkbox" bind:checked={pinTopPlayer} />
    </label>

    <label>
      Max Players Visible:
      <input type="number" bind:value={maxPlayersVisible} />
    </label>
  </div>

  <!-- 📤 Save -->
  <button type="submit" class="save-button">Save Settings</button>

  {#if error}
    <p class="error-text">{error}</p>
  {/if}

  {#if unsavedChanges}
  <div class="unsaved-warning">
    ⚠ You have unsaved visibility changes
  </div>
{/if}

</form>


<style>
  .admin-title {
    text-align: left;
    margin-bottom: 1rem;
  }

  .admin-form {
    max-width: 600px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .form-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

label:has(input[type="color"]) {
  background: #f0f0f0;
  padding: 0.5rem;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

  input[type="text"],
  input[type="number"],
  input[type="color"],
  select {
    width: 100%;
    padding: 0.5em;
    font-size: 1rem;
  }


  .save-button {
    padding: 0.75rem 1.5rem;
    font-weight: bold;
    font-size: 1rem;
    margin-top: 1rem;
  }

  .error-text {
    color: red;
    font-weight: bold;
    text-align: center;
  }

  .leaderboard-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 2rem;
}

.leaderboard-table th,
.leaderboard-table td {
  border: 1px solid #ddd;
  padding: 0.5rem 1rem;
  text-align: left;
}

.leaderboard-table th {
  background: #f4f4f4;
}

.score-list-wrapper {
  max-height: 400px;
  overflow-y: auto;
  border-radius: 12px;
  box-shadow: inset 0 0 5px rgba(0,0,0,0.1);
}

.unsaved-warning {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeeba;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.95rem;
  display: inline-block;
}

/* iOS-style toggle */
.toggle-switch {
  position: relative;
  width: 46px;
  height: 24px;
  background: #ccc;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.3s;
}

.toggle-switch::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  top: 2px;
  left: 2px;
  background: white;
  border-radius: 50%;
  transition: transform 0.3s;
}

.toggle-switch.on {
  background: #00c853;
}

.toggle-switch.on::before {
  transform: translateX(22px);
}

/* highlight unsaved rows */
.modified-row {
  background-color: rgba(255, 243, 205, 0.5);
}

</style>
