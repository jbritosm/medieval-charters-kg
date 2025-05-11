<script setup>
// No need to import components here as they're handled by the router
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-content">
        <h1>Medieval Charters Knowledge Graph</h1>
      </div>
    </header>
    
    <main class="app-content">
      <router-view />
    </main>
    
    <footer class="app-footer">
      <div class="footer-content">
        <p>© 2023 Medieval Charters Knowledge Graph Explorer</p>
      </div>
    </footer>
  </div>
</template>

<style>
body, html {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: #f0f2f5;
  color: #333;
  box-sizing: border-box;
}

*, *:before, *:after {
  box-sizing: inherit;
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
}

.app-header {
  background-color: #2c3e50;
  color: white;
  padding: 1rem 1.5rem;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 100%;
  overflow: hidden;
}

.app-header h1 {
  margin: 0;
  font-size: 1.4rem;
  white-space: normal;
  line-height: 1.3;
  overflow-wrap: break-word;
  word-wrap: break-word;
}

.app-content {
  flex: 1;
  padding: 0;
  background-color: #f0f2f5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
}

.app-footer {
  background-color: #2c3e50;
  color: #ecf0f1;
  text-align: center;
  padding: 0.8rem;
  font-size: 0.8rem;
  width: 100%;
  overflow: hidden;
}

.app-footer p {
  margin: 0;
  white-space: normal;
  overflow-wrap: break-word;
  word-wrap: break-word;
}

.header-content,
.footer-content {
  max-width: 100%;
  width: 100%;
  padding: 0 5px;
  margin: 0 auto;
}

@media (min-width: 768px) {
  .header-content,
  .footer-content {
    max-width: 100%;
    width: 100%;
  }
}

@media (max-width: 768px) {
  .app-header {
    padding: 0.7rem 1rem;
  }
  
  .app-header h1 {
    font-size: 1.2rem;
  }
  
  .app-footer {
    padding: 0.7rem;
    font-size: 0.75rem;
  }
}

@media (max-width: 480px) {
  .app-header h1 {
    font-size: 1rem;
  }
  
  .app-footer {
    font-size: 0.7rem;
  }
}
</style>

