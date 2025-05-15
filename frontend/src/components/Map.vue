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

// Fix Leaflet marker icon paths
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

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
  // Parse coordinates from Point format
  const match = props.coordinates.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
  
  if (!match) {
    console.error('Invalid coordinate format:', props.coordinates);
    return;
  }

  const [longitude, latitude] = match.slice(1).map(Number);

  // Initialize map
  map = L.map(mapContainer.value).setView([latitude, longitude], 13);
  
  // Add tile layer (OpenStreetMap)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // Add marker
  marker = L.marker([latitude, longitude]).addTo(map);
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