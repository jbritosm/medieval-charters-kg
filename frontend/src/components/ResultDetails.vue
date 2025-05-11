<!--
  ResultDetails.vue - Detailed view component for Medieval Charters Knowledge Graph
  This component displays detailed information about a selected entity including
  its properties, relationships, and geographic location on a map (when coordinates are available).
-->
<template>
  <div class="result-details-container">
    <!-- Header section with back button, title, and search context -->
    <div class="header-section">
      <button class="back-button" @click="goBack">← Back to Search</button>
      <h2>{{ resultData?.item?.label || 'Result Details' }}</h2>
      <div v-if="resultData?.item?.entityType" class="entity-type">
        {{ resultData.item.entityType }}
      </div>
      <p v-if="resultData?.searchQuery" class="search-query">
        From search: "{{ resultData.searchQuery }}"
      </p>
    </div>

    <!-- Message displayed when no data is available -->
    <div v-if="!resultData" class="no-data-message">
      <p>No result data found. Please return to the search page.</p>
      <button class="primary-button" @click="goToSearch">Go to Search</button>
    </div>

    <!-- Main content container with responsive layout based on map visibility -->
    <div v-else class="details-content" :class="{ 'map-visible': shouldShowMap }">
      <div class="layout-row" :class="{ 'centered-info': !shouldShowMap }">
        <!-- Information card with scrollable content -->
        <div class="info-card">
          <h3>Information</h3>
          <div class="scrollable-content">
            <!-- Entity coordinates -->
            <div class="info-row" v-if="resultData.item.coords">
              <strong>Coordinates:</strong>
              <span>{{ resultData.item.coordinates }}</span>
            </div>
            
            <!-- Residence information -->
            <div class="info-row" v-if="resultData.item.residence">
              <strong>Residence:</strong>
              <span>{{ resultData.item.residence }}</span>
            </div>
            
            <!-- Residence coordinates -->
            <div class="info-row" v-if="resultData.item.residenceCoordinates">
              <strong>Residence Coordinates:</strong>
              <span>{{ resultData.item.residenceCoordinates }}</span>
            </div>
            
            <!-- Related person information -->
            <div class="info-row" v-if="resultData.item.personName">
              <strong>Related Person:</strong>
              <span>{{ resultData.item.personName }}</span>
            </div>
            
            <!-- Relationship type -->
            <div class="info-row" v-if="resultData.item.relationType">
              <strong>Relationship:</strong>
              <span>{{ resultData.item.relationType }}</span>
            </div>
            
            <!-- Entity description -->
            <div class="info-row" v-if="resultData.item.description">
              <strong>Description:</strong>
              <span>{{ resultData.item.description }}</span>
            </div>
            
            <!-- Related entities section -->
            <div v-if="resultData.item.related && resultData.item.related.length > 0">
              <h4>Related Entities</h4>
              <div class="related-entity-section">
                <div v-for="(rel, index) in resultData.item.related" :key="index" class="related-entity-row">
                  <div class="relation-type">{{ rel.relation }}</div>
                  <div class="relation-name">{{ rel.name }}</div>
                  <div class="relation-entity-type">{{ rel.type }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Map section - only displayed when geographic coordinates are available -->
        <div v-if="shouldShowMap" class="map-section">
          <h3>Location</h3>
          <div class="map-container">
            <l-map
              ref="mapRef"
              :zoom="mapZoom"
              :center="mapCenter"
              :options="{ zoomControl: true }"
            >
              <!-- OpenStreetMap base layer -->
              <l-tile-layer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                layer-type="base"
                name="OpenStreetMap"
                attribution="&copy; OpenStreetMap contributors"
              ></l-tile-layer>
              
              <!-- Entity location marker (blue) -->
              <l-circle-marker
                v-if="resultData.item.coords"
                :lat-lng="[resultData.item.coords.lat, resultData.item.coords.lon]"
                :radius="8"
                color="#fff"
                :fill-color="'#3498db'"
                :fill-opacity="0.8"
                :weight="1"
              >
                <l-popup>
                  <strong>{{ resultData.item.label }}</strong>
                </l-popup>
              </l-circle-marker>
              
              <!-- Residence location marker (red) -->
              <l-circle-marker
                v-if="resultData.item.resCoords"
                :lat-lng="[resultData.item.resCoords.lat, resultData.item.resCoords.lon]"
                :radius="8"
                color="#fff"
                :fill-color="'#e74c3c'"
                :fill-opacity="0.8"
                :weight="1"
              >
                <l-popup>
                  <strong>Residence: {{ resultData.item.residence }}</strong>
                </l-popup>
              </l-circle-marker>
            </l-map>
          </div>
          
          <!-- Map legend for multiple markers -->
          <div v-if="hasResidenceCoordinates" class="map-legend">
            <div class="legend-item">
              <span class="legend-marker entity-marker"></span>
              <span>Entity Location</span>
            </div>
            <div class="legend-item">
              <span class="legend-marker residence-marker"></span>
              <span>Residence</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Toggle button for raw data display -->
      <div class="show-advanced-container">
        <button @click="toggleAdvancedData" class="toggle-advanced-button">
          {{ showAdvancedData ? 'Hide Raw Data' : 'Show Raw Data' }}
        </button>
      </div>

      <!-- Raw SPARQL data section (collapsible) -->
      <div v-if="showAdvancedData" class="raw-data-card">
        <h3>Raw Data</h3>
        <pre class="json-display">{{ JSON.stringify(resultData.rawData, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
// Import Vue and third-party libraries
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { LMap, LTileLayer, LCircleMarker, LPopup } from '@vue-leaflet/vue-leaflet';
import "leaflet/dist/leaflet.css";

// Fix Leaflet icon issue with webpack/vite bundling
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: import.meta.env.BASE_URL + 'leaflet/marker-icon-2x.png',
  iconUrl: import.meta.env.BASE_URL + 'leaflet/marker-icon.png',
  shadowUrl: import.meta.env.BASE_URL + 'leaflet/marker-shadow.png'
});

// Initialize router and reactive state
const router = useRouter();
const resultData = ref(null);          // Contains the selected entity data
const mapRef = ref(null);              // Reference to the Leaflet map component
const hasCoordinates = ref(false);     // Flag for entity coordinates
const hasResidenceCoordinates = ref(false);  // Flag for residence coordinates
const showAdvancedData = ref(false);   // Toggle state for raw data display

/**
 * Determines whether to show the map based on available coordinates
 * Map is displayed if either entity or residence has coordinates
 */
const shouldShowMap = computed(() => {
  return hasCoordinates.value || hasResidenceCoordinates.value;
});

/**
 * Calculates the initial map center position
 * Prioritizes entity coordinates, falls back to residence coordinates
 */
const mapCenter = computed(() => {
  if (resultData.value?.item?.coords) {
    return [resultData.value.item.coords.lat, resultData.value.item.coords.lon];
  } else if (resultData.value?.item?.resCoords) {
    return [resultData.value.item.resCoords.lat, resultData.value.item.resCoords.lon];
  }
  return [0, 0];
});

/**
 * Sets appropriate zoom level for the map
 * Zooms in when coordinates are available, default world view otherwise
 */
const mapZoom = computed(() => {
  if (hasCoordinates.value || hasResidenceCoordinates.value) {
    return 13;
  }
  return 2;
});

/**
 * Toggles the display of raw SPARQL data
 * Used for debugging and advanced analysis
 */
const toggleAdvancedData = () => {
  showAdvancedData.value = !showAdvancedData.value;
};

/**
 * Navigates back to the search results page
 */
const goBack = () => {
  router.back();
};

// Go to search page
const goToSearch = () => {
  router.push('/');
};

// Parse the WKT (Well-Known Text) coordinate format from Wikidata
const parseWKT = (wkt) => {
  if (!wkt) return null;
  
  // Point(lon lat) format
  const pointMatch = wkt.match(/Point\(([^ ]+) ([^)]+)\)/);
  if (pointMatch) {
    const lon = parseFloat(pointMatch[1]);
    const lat = parseFloat(pointMatch[2]);
    return { lat, lon };
  }
  
  return null;
};

onMounted(async () => {
  console.log("Component mounted");
  
  // Retrieve the selected result from localStorage
  const storedData = localStorage.getItem('selectedResult');
  
  if (storedData) {
    try {
      resultData.value = JSON.parse(storedData);
      console.log("Result data loaded:", resultData.value);
      
      // Check if entity has coordinates
      if (resultData.value.item.coords) {
        hasCoordinates.value = true;
        console.log("Entity has coordinates:", resultData.value.item.coords);
      }
      
      // Check if residence has coordinates
      if (resultData.value.item.resCoords) {
        hasResidenceCoordinates.value = true;
        console.log("Residence has coordinates:", resultData.value.item.resCoords);
      }
      
      await nextTick();
      
      // Wait for the map to be properly initialized
      if (shouldShowMap.value && mapRef.value) {
        console.log("Map reference available:", mapRef.value);
        
        // Multiple calls to invalidateSize at different intervals to ensure proper rendering
        setTimeout(() => {
          const map = mapRef.value.leafletObject;
          if (map) {
            map.invalidateSize();
            
            // If we have both coordinates, fit bounds to show both
            if (hasCoordinates.value && hasResidenceCoordinates.value) {
              const bounds = [
                [resultData.value.item.coords.lat, resultData.value.item.coords.lon],
                [resultData.value.item.resCoords.lat, resultData.value.item.resCoords.lon]
              ];
              map.fitBounds(bounds, { padding: [30, 30] });
            }
          }
        }, 200);
        
        // Additional call to handle slower layouts
        setTimeout(() => {
          const map = mapRef.value.leafletObject;
          if (map) map.invalidateSize();
        }, 500);
        
        // Final resize after everything is settled
        setTimeout(() => {
          const map = mapRef.value.leafletObject;
          if (map) map.invalidateSize();
        }, 1000);
      }
    } catch (err) {
      console.error("Error parsing stored data:", err);
    }
  }
});
</script>

<style scoped>
.result-details-container {
  width: 100vw;
  max-width: 100vw;
  margin: 0;
  padding: 0;
  text-align: left;
  display: flex;
  flex-direction: column;
  height: 100vh;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}

.layout-row {
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
  overflow: hidden;
  width: 100%;
  padding: 0 15px;
  box-sizing: border-box;
}

/* Center the info card when no map is displayed */
.centered-info {
  justify-content: center;
  align-items: center;
}

.centered-info .info-card {
  max-width: 650px;
  width: 100%;
  margin: 0 auto;
}

@media (min-width: 768px) {
  .layout-row {
    flex-direction: row;
    height: calc(100vh - 180px);
    padding: 0 20px;
    width: 100%;
  }
  
  .info-card {
    width: 40%;
    margin-right: 20px;
  }
  
  .map-section {
    width: 60%;
    flex: 1;
  }
  
  /* Adjust info card width when no map is displayed */
  .centered-info .info-card {
    width: 70%;
    max-width: 700px;
    margin: 0 auto;
  }
  
  /* When no map, switch back to column on mobile */
  .centered-info {
    flex-direction: column;
  }
}

@media (max-width: 768px) {
  .result-details-container {
    height: 100vh;
    width: 100vw;
    padding: 0;
    margin: 0;
  }
  
  .layout-row {
    flex-direction: column;
    padding: 0 10px;
    width: 100%;
  }
  
  .centered-info .info-card {
    width: 100%;
  }
  
  .map-container {
    height: 350px;
    width: 100%;
  }
  
  .info-card {
    padding: 15px;
    width: 100%;
  }
  
  .map-visible .info-card {
    padding: 12px;
  }
  
  .map-visible .info-row {
    margin-bottom: 8px;
  }
  
  h3 {
    margin: 10px 0;
  }
}

@media (max-width: 480px) {
  .result-details-container {
    height: 100vh;
    width: 100vw;
    margin: 0;
    padding: 0;
  }
  
  .layout-row {
    padding: 0 5px;
    width: 100%;
  }
  
  .map-container {
    height: 250px;
    width: 100%;
  }
  
  .header-section {
    margin-bottom: 10px;
  }
  
  .info-card, .map-section {
    padding: 10px;
    width: 100%;
  }
  
  .map-visible .info-card {
    padding: 8px;
  }
  
  h3 {
    margin: 8px 0 10px;
    font-size: 1.1rem;
  }
  
  .details-content {
    gap: 10px;
  }
}

.header-section {
  width: 100%;
  padding: 15px;
  box-sizing: border-box;
  background-color: #f8f9fa;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 10;
}

.details-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0;
  box-sizing: border-box;
  height: calc(100vh - 140px);
  width: 100%;
}

.info-card {
  background-color: #fff;
  border-radius: 8px;
  padding: 15px;
  border: 1px solid #ddd;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.scrollable-content {
  overflow-y: auto;
  flex: 1;
  padding-right: 5px;
  width: 100%;
}

.map-section {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.map-container {
  overflow: hidden;
  flex: 1;
  position: relative;
  z-index: 0;
  width: 100%;
}

/* Fix Leaflet styling issues */
:deep(.leaflet-container) {
  height: 100%;
  width: 100%;
}

:deep(.leaflet-tile-pane),
:deep(.leaflet-pane),
:deep(.leaflet-map-pane),
:deep(.leaflet-control-container) {
  z-index: 1 !important;
}

:deep(.leaflet-popup-content-wrapper) {
  max-width: 300px;
}

:deep(.leaflet-popup-content) {
  margin: 8px 12px;
}

:deep(.leaflet-popup-content p) {
  margin: 5px 0;
}

.map-legend {
  margin-top: 10px;
  display: flex;
  gap: 20px;
  justify-content: center;
  padding: 10px;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-marker {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid #fff;
}

.entity-marker {
  background-color: #3498db;
}

.residence-marker {
  background-color: #e74c3c;
}

.info-row {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  word-break: break-word;
  overflow-wrap: break-word;
}

.info-row span {
  overflow: auto;
  max-height: 100px;
}

.info-row strong {
  margin-bottom: 5px;
  color: #555;
  flex-shrink: 0;
}

.related-entity-section {
  max-height: 200px;
  overflow-y: auto;
  border-top: 1px solid #eee;
  padding-top: 10px;
}

.related-entity-row {
  padding: 10px;
  border-bottom: 1px solid #eee;
  margin-bottom: 10px;
}

.related-entity-row:last-child {
  border-bottom: none;
}

.relation-type {
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 5px;
}

.relation-name {
  color: #555;
  word-break: break-word;
  overflow-wrap: break-word;
}

.relation-entity-type {
  font-size: 12px;
  color: #777;
  margin-top: 5px;
}

.show-advanced-container {
  display: flex;
  justify-content: center;
  margin: 0;
  width: 100%;
  padding: 10px 0;
  background-color: #f8f9fa;
  border-top: 1px solid #eee;
  z-index: 10;
}

.toggle-advanced-button {
  background-color: #f8f9fa;
  color: #3498db;
  border: 1px solid #ddd;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.toggle-advanced-button:hover {
  background-color: #edf2f7;
  border-color: #3498db;
}

.raw-data-card {
  background-color: #fff;
  border-radius: 8px;
  padding: 15px;
  border: 1px solid #ddd;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  max-height: 200px;
  overflow-y: auto;
}

.json-display {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
}

/* Responsive layout for larger screens */
@media (min-width: 768px) {
  .info-row {
    flex-direction: row;
  }
  
  .info-row strong {
    width: 120px;
    margin-bottom: 0;
  }
}

h2, h3, h4 {
  margin: 10px 0;
  color: #2c3e50;
}

h4 {
  margin-top: 15px;
  margin-bottom: 8px;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}

.entity-type {
  display: inline-block;
  background-color: #edf2f7;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
  color: #4a5568;
  margin-bottom: 10px;
}

.search-query {
  color: #666;
  font-style: italic;
  margin-top: 5px;
}

.back-button {
  background-color: transparent;
  color: #3498db;
  border: 1px solid #3498db;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.back-button:hover {
  background-color: #3498db;
  color: white;
}

.no-data-message {
  padding: 30px;
  text-align: center;
  background-color: #f8f9fa;
  border-radius: 4px;
  margin: 30px 0;
}

.primary-button {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 15px;
}

.primary-button:hover {
  background-color: #2980b9;
}
</style> 