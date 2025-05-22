<script>
  // no JS needed for now
</script>

<style>
  body {
    font-family: sans-serif;
    padding: 2rem;
    background: #f5f5f5;
  }

  .page-container {
    padding: 3rem;
  }

  .flex-container {
    display: flex;
    border: 2px dashed #ccc;
    padding: 1rem;
    background: white;
    min-height: 200px;
    justify-content: space-between;
    flex-wrap: wrap;
    margin-bottom: 1rem;
    gap: 1rem;
  }

  .item {
    flex: 0 0 200px;
    background: #00c853;
    color: white;
    padding: 1rem;
    margin: 0rem;
    border-radius: 8px;
    flex: 1 1 200px;
    text-align: center;
  }

  .navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: black;
  color: white;
}

.nav-links {
  display: flex;
  gap: 1rem;
}

.layout {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.sidebar {
  flex: 1 1 50%;
  background: #eee;
  padding: 1rem;
}

.content {
  flex: 1 1 40%;
  background: #fff;
  padding: 1rem;
}




</style>
<div class="page-container">
<nav class="navbar">
  <div class="logo">🏌️ Club Green</div>
  <div class="nav-links">
    <a href="#">Home</a>
    <a href="#">Events</a>
    <a href="#">Contact</a>
  </div>
</nav>

<div class="layout">
  <div class="sidebar">Sidebar</div>
  <div class="content">Main content goes here</div>
</div>

<p>Try changing the container’s flex properties above in your <code>.flex-container</code> CSS class!</p>
</div>