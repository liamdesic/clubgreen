<script lang="ts">
  import '$lib/styles/EditEvent.css';
  export let adText: string;
  export let onAdTextChange: (val: string) => void;
  export let adUrl: string;
  export let onAdUrlChange: (val: string) => void;
</script>

<section class="form-block">
  <h3 class="form-block-title">Advertisement Settings</h3>
  <label for="scorecard-ad-text" class="form-label">Ad Text</label>
  <input id="scorecard-ad-text" class="input" type="text" bind:value={adText} on:input={e => onAdTextChange(e.target.value)} placeholder="e.g., Want Club Green mini-golf for your event?" />
  <label for="scorecard-ad-url" class="form-label">Ad Link URL</label>
  <input id="scorecard-ad-url" class="input" type="url" bind:value={adUrl} on:input={e => onAdUrlChange(e.target.value)} placeholder="https://clubgreen.au" />
</section> 