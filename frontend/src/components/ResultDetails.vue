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

    <!-- Loading indicator -->
    <div v-else-if="loading" class="loading-container">
      <p>Loading complete entity information...</p>
    </div>

    <!-- Main content container with responsive layout based on map visibility -->
    <div v-else class="details-content" :class="{ 'map-visible': shouldShowMap }">
      <div class="layout-row" :class="{ 'centered-info': !shouldShowMap }">
        <!-- Information card with scrollable content -->
        <div class="info-card">
          <h3>Information</h3>
          <div class="scrollable-content">
            <!-- Entity ID -->
            <div class="info-row" v-if="entityId">
              <strong>Entity ID:</strong>
              <span>{{ entityId }}</span>
            </div>
            
            <!-- Entity coordinates -->
            <div class="info-row" v-if="resultData.item.coords">
              <strong>Coordinates:</strong>
              <span>{{ resultData.item.coordinates }}</span>
            </div>
            
            <!-- Entity description -->
            <div class="info-row" v-if="resultData.item.description">
              <strong>Description:</strong>
              <span>{{ resultData.item.description }}</span>
            </div>
            
            <!-- Entity properties section -->
            <div v-if="entityProperties.length > 0">
              <h4>Properties</h4>
              <div class="properties-section">
                <div v-for="(prop, index) in entityProperties" :key="index" class="property-row">
                  <div class="property-label">{{ prop.label }}</div>
                  <div class="property-value">{{ prop.value }}</div>
                </div>
              </div>
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
            
            <!-- Related entities section -->
            <div v-if="allRelatedEntities.length > 0">
              <h4>Related Entities</h4>
              <div class="related-entity-section">
                <div v-for="(rel, index) in allRelatedEntities" :key="index" class="related-entity-row">
                  <div class="relation-type">{{ rel.relation }}</div>
                  <div class="relation-name">{{ rel.name }}</div>
                  <div class="relation-entity-type" v-if="rel.type">{{ rel.type }}</div>
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
                :fill-color="'#9999CC'"
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
                :fill-color="'#666666'"
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
        <pre class="json-display">{{ JSON.stringify(completeEntityData || resultData.rawData, null, 2) }}</pre>
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
import api from '../services/api';

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
const completeEntityData = ref(null);  // Contains complete entity data from additional query
const entityProperties = ref([]);      // Formatted entity properties
const allRelatedEntities = ref([]);    // Combined related entities
const entityId = ref(null);            // Entity ID
const mapRef = ref(null);              // Reference to the Leaflet map component
const hasCoordinates = ref(false);     // Flag for entity coordinates
const hasResidenceCoordinates = ref(false);  // Flag for residence coordinates
const showAdvancedData = ref(false);   // Toggle state for raw data display
const loading = ref(false);            // Loading state for additional data

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

/**
 * Go to search page
 */
const goToSearch = () => {
  router.push('/');
};

/**
 * Parse the WKT (Well-Known Text) coordinate format from Wikidata
 */
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

/**
 * Extract entity ID from URI
 */
const extractEntityId = (uri) => {
  if (!uri) return null;
  
  // Extract ID from URI pattern
  const match = uri.match(/\/entity\/([^/]+)$/);
  if (match) {
    return match[1];
  }
  
  return null;
};

/**
 * Fetch complete entity information using SPARQL
 */
const fetchEntityDetails = async (entityUri) => {
  if (!entityUri) return;
  
  loading.value = true;
  
  try {
    // Extract entity ID from URI
    const id = extractEntityId(entityUri);
    if (id) {
      entityId.value = id;
      
      // Build SPARQL query to get all properties and values for this entity
      const query = `
PREFIX wb: <https://medievalcharterskg.wikibase.cloud/entity/>
PREFIX wbt: <https://medievalcharterskg.wikibase.cloud/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX p: <https://medievalcharterskg.wikibase.cloud/prop/>
PREFIX ps: <https://medievalcharterskg.wikibase.cloud/prop/statement/>
PREFIX pq: <https://medievalcharterskg.wikibase.cloud/prop/qualifier/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?propLabel ?value ?valueLabel WHERE {
  # Get the entity
  wb:${id} ?prop ?statement .
  
  # Only get properties (not labels, etc)
  ?property wikibase:directClaim ?prop .
  ?property rdfs:label ?propLabel .
  
  # Get the value
  ?statement ?ps ?value .
  
  # Only get direct values
  ?property wikibase:statementProperty ?ps .
  
  # Optional label for the value
  OPTIONAL {
    ?value rdfs:label ?valueLabel .
  }
  
  # Get labels in Spanish or English
  FILTER(LANG(?propLabel) = "es" || LANG(?propLabel) = "en")
  
  # Filter out some system properties
  FILTER(?prop != rdfs:label)
  FILTER(?prop != <http://schema.org/description>)
}
ORDER BY ?propLabel`;

      // Execute the query
      const response = await api.sparqlQuery(query);
      completeEntityData.value = response.data;
      
      // Process properties
      if (response.data && response.data.results && response.data.results.bindings) {
        const properties = [];
        const relatedEntities = [];
        
        response.data.results.bindings.forEach(binding => {
          // Get property label
          const propLabel = binding.propLabel?.value || 'Unknown property';
          
          // Get value or valueLabel if available
          let value = binding.valueLabel?.value || binding.value?.value || 'Unknown value';
          
          // Check if this is a related entity
          if (binding.value?.type === 'uri' && binding.value.value.includes('/entity/')) {
            // Add to related entities
            const entityLabel = binding.valueLabel?.value || extractEntityId(binding.value.value);
            
            // Only add entities whose labels are not just numbers
            if (!isNumericLabel(entityLabel)) {
              relatedEntities.push({
                relation: propLabel,
                name: entityLabel,
                uri: binding.value.value
              });
            }
          } else {
            // Add to properties
            properties.push({
              label: propLabel,
              value: value
            });
          }
        });
        
        // Set properties and combine with existing related entities
        entityProperties.value = properties;
        
        // Combine all related entities, filtering out numeric labels
        const existingRelated = (resultData.value.item.related || [])
          .filter(rel => !isNumericLabel(rel.name));
        
        allRelatedEntities.value = [...relatedEntities, ...existingRelated];
      }
    }
  } catch (err) {
    console.error("Error fetching entity details:", err);
  } finally {
    loading.value = false;
  }
};

/**
 * Check if a label is just a number
 */
const isNumericLabel = (label) => {
  if (!label) return false;
  return /^\d+$/.test(label.trim());
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
      }
      
      // Fetch additional entity details
      if (resultData.value.rawData) {
        // Try to get the entity URI
        const entityUri = resultData.value.rawData.entity?.value || 
                          resultData.value.rawData.person?.value;
        
        if (entityUri) {
          await fetchEntityDetails(entityUri);
        }
      }
    } catch (err) {
      console.error("Error parsing stored data:", err);
    }
  }
});
</script>

<style>
@import '../grayscale.css';

.result-details-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 15px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 140px);
  overflow: hidden;
}

.header-section {
  margin-bottom: 20px;
  text-align: left;
}

.back-button {
  background-color: var(--gray-200);
  color: var(--text-primary);
  border: 1px solid var(--border-light);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-bottom: 10px;
  transition: all 0.2s;
}

.back-button:hover {
  background-color: var(--gray-300);
  border-color: var(--accent-medium);
}

h2 {
  margin: 10px 0;
  color: var(--text-primary);
  font-size: 24px;
}

.entity-type {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.search-query {
  font-style: italic;
  color: var(--text-light);
  margin: 5px 0;
}

.no-data-message, .loading-container {
  text-align: center;
  margin: 50px 0;
  color: var(--text-secondary);
}

.primary-button {
  background-color: var(--accent-dark);
  color: var(--gray-100);
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 20px;
  transition: background-color 0.3s;
}

.primary-button:hover {
  background-color: var(--accent-medium);
}

.details-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.layout-row {
  display: flex;
  flex: 1;
  gap: 20px;
  overflow: hidden;
}

.centered-info {
  justify-content: center;
}

.map-visible .info-card {
  width: 40%;
}

.map-visible .map-section {
  width: 60%;
}

.info-card, .map-section, .raw-data-card {
  background-color: var(--bg-primary);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid var(--border-light);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  background-color: var(--gray-200);
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
  border: 1px solid var(--gray-100);
}

.entity-marker {
  background-color: var(--accent-medium);
}

.residence-marker {
  background-color: var(--gray-500);
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
  color: var(--text-secondary);
  flex-shrink: 0;
}

.properties-section, .related-entity-section {
  max-height: 200px;
  overflow-y: auto;
  border-top: 1px solid var(--border-light);
  padding-top: 10px;
}

.property-row, .related-entity-row {
  padding: 10px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 10px;
}

.property-row:last-child, .related-entity-row:last-child {
  border-bottom: none;
}

.property-label, .relation-type {
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 5px;
}

.property-value, .relation-name {
  color: var(--text-secondary);
  word-break: break-word;
  overflow-wrap: break-word;
}

.relation-entity-type {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 5px;
}

.show-advanced-container {
  display: flex;
  justify-content: center;
  margin: 0;
  width: 100%;
  padding: 10px 0;
  background-color: var(--bg-secondary);
  border-top: 1px solid var(--border-light);
  z-index: 10;
}

.toggle-advanced-button {
  background-color: var(--bg-secondary);
  color: var(--accent-dark);
  border: 1px solid var(--border-light);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.toggle-advanced-button:hover {
  background-color: var(--gray-300);
  border-color: var(--accent-medium);
}

.raw-data-card {
  background-color: var(--bg-primary);
  border-radius: 8px;
  padding: 15px;
  border: 1px solid var(--border-light);
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
  color: var(--text-primary);
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
  color: var(--text-primary);
}

h4 {
  margin-top: 20px;
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 5px;
}

@media (max-width: 768px) {
  .layout-row {
    flex-direction: column;
  }
  
  .map-visible .info-card,
  .map-visible .map-section {
    width: 100%;
  }
  
  .map-section {
    height: 300px;
  }
  
  .result-details-container {
    height: auto;
    padding: 10px;
  }
}
</style> 