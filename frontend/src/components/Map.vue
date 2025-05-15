<!-- Map.vue - Component for displaying geographic coordinates -->
<template>
  <div class="map-container">
    <div id="map" ref="mapContainer"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const props = defineProps({
  coordinates: {
    type: String,
    required: true
  }
});

const mapContainer = ref(null);
let map = null;
let marker = null;

onMounted(() => {
  console.log('Map component mounted');
  console.log('Received coordinates:', props.coordinates);
  
  // Parse coordinates from Point format
  const match = props.coordinates.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
  console.log('Coordinate match result:', match);
  
  if (!match) {
    console.error('Invalid coordinate format:', props.coordinates);
    return;
  }

  const [longitude, latitude] = match.slice(1).map(Number);
  console.log('Parsed coordinates:', { latitude, longitude });

  // Initialize map
  map = L.map(mapContainer.value).setView([latitude, longitude], 13);
  console.log('Map initialized');
  
  // Add tile layer (OpenStreetMap)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  console.log('Tile layer added');

  // Add marker
  marker = L.marker([latitude, longitude]).addTo(map);
  console.log('Marker added');
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 300px;
  margin: 20px 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ddd;
}

#map {
  width: 100%;
  height: 100%;
}
</style> 