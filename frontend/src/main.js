/**
 * Medieval Charters Knowledge Graph - Main Application Entry
 * 
 * This file initializes the Vue application with the router
 * and mounts it to the DOM.
 */
import { createApp } from 'vue'
import './style.css'
import 'leaflet/dist/leaflet.css'
import App from './App.vue'
import router from './router'


createApp(App)
  .use(router)
  .mount('#app')
