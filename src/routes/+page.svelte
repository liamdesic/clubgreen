<script>
  import { Edit, Trophy, Settings } from 'lucide-svelte';
</script>

<svelte:head>
  <title>Club Green Score System</title>
</svelte:head>

<div class="landing-container">
  <h1 class="title">🎯 Club Green Score System</h1>

  <div class="card-grid">
    <a class="nav-card" href="/scorecard">
      <Edit size={40} />
      <h2>Scorecard</h2>
      <p>Enter strokes and track players during your event.</p>
    </a>

    <a class="nav-card" href="/leaderboard">
      <Trophy size={40} />
      <h2>Leaderboard</h2>
      <p>Live leaderboard display for guests and players to view.</p>
    </a>

    <a class="nav-card" href="/admin">
      <Settings size={40} />
      <h2>Admin</h2>
      <p>Manage settings, logos, ads, and scores behind the scenes.</p>
    </a>
  </div>
</div>

<style>
  .landing-container {
    background: #0f2f2e;
    color: white;
    min-height: 100vh;
    padding: 2rem;
    text-align: center;
  }

  .title {
    font-size: 2.5rem;
    margin-bottom: 3rem;
    font-weight: 700;
  }

  .card-grid {
    display: flex;
    justify-content: center;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .nav-card {
    background: white;
    color: #0f2f2e;
    padding: 2rem;
    border-radius: 1.5rem;
    width: 280px;
    text-decoration: none;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  }

  .nav-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 25px rgba(0, 0, 0, 0.2);
  }

  .nav-card :global(svg) {
    margin-bottom: 1rem;
    color: #00c853;
  }

  .nav-card h2 {
    margin: 0.5rem 0;
    font-size: 1.5rem;
  }

  .nav-card p {
    font-size: 0.95rem;
    line-height: 1.4;
    opacity: 0.8;
  }

  @media (max-width: 768px) {
    .card-grid {
      flex-direction: column;
      align-items: center;
    }

    .nav-card {
      width: 90%;
    }
  }
</style>
