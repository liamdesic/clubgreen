<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { devLogger, type LogContext, type LogLevel } from './logger';
  
  let showPanel = false;
  let logs: any[] = [];
  let selectedContext: LogContext | 'all' = 'all';
  let selectedLevel: LogLevel | 'all' = 'all';
  let autoScroll = true;
  let logContainer: HTMLElement;

  // Keyboard shortcut to toggle panel (Ctrl+Shift+D)
  function handleKeydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.shiftKey && event.key === 'D') {
      event.preventDefault();
      showPanel = !showPanel;
      if (showPanel) {
        refreshLogs();
      }
    }
  }

  function refreshLogs() {
    logs = devLogger.getRecentLogs(100);
    if (autoScroll && logContainer) {
      setTimeout(() => {
        logContainer.scrollTop = logContainer.scrollHeight;
      }, 0);
    }
  }

  function clearLogs() {
    devLogger.clearLogs();
    logs = [];
  }

  function exportLogs() {
    const data = devLogger.exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dev-logs-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Filter logs based on selected context and level
  $: filteredLogs = logs.filter(log => {
    const contextMatch = selectedContext === 'all' || log.context === selectedContext;
    const levelMatch = selectedLevel === 'all' || log.level === selectedLevel;
    return contextMatch && levelMatch;
  });

  // Auto-refresh logs every 2 seconds when panel is open
  let refreshInterval: number;

  onMount(() => {
    if (import.meta.env.DEV) {
      document.addEventListener('keydown', handleKeydown);
      refreshInterval = setInterval(() => {
        if (showPanel) {
          refreshLogs();
        }
      }, 2000);
    }
  });

  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', handleKeydown);
    }
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });

  function formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString();
  }

  function getLevelColor(level: LogLevel): string {
    switch (level) {
      case 'debug': return '#6b7280';
      case 'info': return '#3b82f6';
      case 'warn': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  }
</script>

{#if import.meta.env.DEV}
  <!-- Toggle Button -->
  {#if !showPanel}
    <button 
      class="dev-toggle"
      on:click={() => { showPanel = true; refreshLogs(); }}
      title="Open Dev Panel (Ctrl+Shift+D)"
    >
      🔧
    </button>
  {/if}

  {#if showPanel}
    <div class="dev-panel">
      <div class="dev-header">
        <h3>Development Panel</h3>
        <div class="dev-controls">
          <select bind:value={selectedContext}>
            <option value="all">All Contexts</option>
            <option value="auth">Auth</option>
            <option value="database">Database</option>
            <option value="api">API</option>
            <option value="ui">UI</option>
            <option value="store">Store</option>
            <option value="validation">Validation</option>
            <option value="general">General</option>
          </select>
          
          <select bind:value={selectedLevel}>
            <option value="all">All Levels</option>
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
          </select>
          
          <label>
            <input type="checkbox" bind:checked={autoScroll} />
            Auto-scroll
          </label>
          
          <button on:click={refreshLogs}>Refresh</button>
          <button on:click={clearLogs}>Clear</button>
          <button on:click={exportLogs}>Export</button>
          <button on:click={() => showPanel = false}>×</button>
        </div>
      </div>

      <div class="dev-content" bind:this={logContainer}>
        {#each filteredLogs as log (log.timestamp)}
          <div class="log-entry" style="border-left-color: {getLevelColor(log.level)}">
            <div class="log-meta">
              <span class="log-time">{formatTime(log.timestamp)}</span>
              <span class="log-context">[{log.context.toUpperCase()}]</span>
              <span class="log-level" style="color: {getLevelColor(log.level)}">
                {log.level.toUpperCase()}
              </span>
            </div>
            <div class="log-message">{log.message}</div>
            {#if log.data}
              <div class="log-data">
                <pre>{JSON.stringify(log.data, null, 2)}</pre>
              </div>
            {/if}
            {#if log.stackTrace && log.level === 'error'}
              <div class="log-stack">
                <details>
                  <summary>Stack Trace</summary>
                  <pre>{log.stackTrace}</pre>
                </details>
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <div class="dev-footer">
        <span>Logs: {filteredLogs.length} / {logs.length}</span>
        <span>Press Ctrl+Shift+D to toggle</span>
      </div>
    </div>
  {/if}
{/if}

<style>
  .dev-toggle {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9998;
    background: #1f2937;
    color: white;
    border: none;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    font-size: 20px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s;
  }

  .dev-toggle:hover {
    transform: scale(1.1);
  }

  .dev-panel {
    position: fixed;
    bottom: 0;
    right: 0;
    width: 60vw;
    height: 50vh;
    background: #1f2937;
    color: white;
    border: 1px solid #374151;
    border-bottom: none;
    border-right: none;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    font-family: 'Courier New', monospace;
    font-size: 12px;
  }

  .dev-header {
    background: #111827;
    padding: 8px 12px;
    border-bottom: 1px solid #374151;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .dev-header h3 {
    margin: 0;
    font-size: 14px;
    color: #f3f4f6;
  }

  .dev-controls {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .dev-controls select,
  .dev-controls button {
    padding: 2px 6px;
    background: #374151;
    color: white;
    border: 1px solid #4b5563;
    border-radius: 3px;
    font-size: 11px;
  }

  .dev-controls label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
  }

  .dev-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    background: #1f2937;
  }

  .log-entry {
    margin-bottom: 8px;
    padding: 6px;
    background: #374151;
    border-radius: 3px;
    border-left: 3px solid #6b7280;
  }

  .log-meta {
    display: flex;
    gap: 8px;
    margin-bottom: 4px;
    font-size: 10px;
  }

  .log-time {
    color: #9ca3af;
  }

  .log-context {
    color: #fbbf24;
    font-weight: bold;
  }

  .log-level {
    font-weight: bold;
  }

  .log-message {
    color: #f3f4f6;
    margin-bottom: 4px;
  }

  .log-data {
    background: #111827;
    padding: 4px;
    border-radius: 2px;
    margin-top: 4px;
  }

  .log-data pre {
    margin: 0;
    color: #10b981;
    font-size: 10px;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .log-stack {
    margin-top: 4px;
  }

  .log-stack summary {
    cursor: pointer;
    color: #ef4444;
    font-size: 10px;
  }

  .log-stack pre {
    margin: 4px 0 0 0;
    color: #fca5a5;
    font-size: 9px;
    white-space: pre-wrap;
  }

  .dev-footer {
    background: #111827;
    padding: 4px 12px;
    border-top: 1px solid #374151;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10px;
    color: #9ca3af;
  }

  @media (max-width: 768px) {
    .dev-panel {
      width: 100vw;
      height: 40vh;
    }
  }
</style>