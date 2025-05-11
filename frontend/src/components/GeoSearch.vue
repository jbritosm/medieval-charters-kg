<!--
  GeoSearch.vue - Main search component for the Medieval Charters Knowledge Graph
  This component allows users to search for medieval entities (people, places) and
  displays results with pagination, relevance indicators, and geographic information.
-->
<template>
  <div class="geo-search-container">
    <h2>Geographic Search</h2>
    <!-- Search form that prevents default form submission and calls the executeSearch method -->
    <form @submit.prevent="executeSearch">
      <div class="search-input-container">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Search for places or people (e.g., 'Oviedo', 'Juan Pérez')" 
          class="search-input"
        />
        <button type="submit" class="search-button" :disabled="loading">
          {{ loading ? 'Searching...' : 'Search' }}
        </button>
      </div>
    </form>
    
    <!-- Status indicators for loading state and errors -->
    <div v-if="loading" class="search-status">Searching...</div>
    <div v-else-if="error" class="search-status error">{{ error }}</div>
    
    <!-- Results container, only shown when results are available -->
    <div v-if="results" class="results-container">
      <h3>Results ({{ resultsCount }})</h3>
      
      <!-- No results message -->
      <div v-if="resultsCount === 0" class="no-results">
        No results found for "{{ lastSearchQuery }}".
      </div>
      
      <!-- Results list with items styled based on relevance score -->
      <ul v-else class="results-list">
        <li v-for="(item, index) in paginatedResults" :key="index" class="result-item" @click="viewDetails(item, computedIndex(index))" :class="{'high-relevance': item.score > 150, 'medium-relevance': item.score > 100 && item.score <= 150, 'low-relevance': item.score <= 100}">
          <!-- Result header with title and match quality indicator -->
          <div class="result-header">
            <div class="result-title">{{ item.label }}</div>
            <div class="match-quality" v-if="item.score > 0">
              <span class="match-label">{{ getMatchQuality(item.score) }}</span>
            </div>
          </div>
          
          <!-- Entity type and visual relevance indicator -->
          <div class="result-type-container">
            <div class="result-type">{{ item.entityType }}</div>
            <div class="result-relevance" v-if="item.score > 0">
              <span class="relevance-indicator" :style="{ width: Math.min(100, item.score/2) + '%' }"></span>
            </div>
          </div>
          
          <!-- Geographic coordinates if available -->
          <div v-if="item.coordinates" class="result-coordinates">
            <i class="location-icon">📍</i> {{ item.coordinates }}
          </div>
          
          <!-- Residence information if available -->
          <div v-if="item.residence" class="result-residence">
            <span class="relation-label">Residence:</span>
            <span class="residence-name">{{ item.residence }}</span>
          </div>
          
          <!-- Residence coordinates if available -->
          <div v-if="item.residenceCoordinates" class="result-residence-coordinates">
            <i class="location-icon">📍</i> {{ item.residenceCoordinates }}
          </div>
          
          <!-- Related person information if available -->
          <div v-if="item.personName" class="result-related-person">
            <span class="relation-label">{{ item.relationType }}:</span>
            <span class="person-name">{{ item.personName }}</span>
          </div>
          
          <!-- List of related entities if available -->
          <div v-if="item.related && item.related.length > 0" class="result-related">
            <div v-for="(rel, relIndex) in item.related" :key="relIndex" class="related-item">
              <span class="relation-label">{{ rel.relation }}:</span>
              <span class="related-name">{{ rel.name }}</span>
              <span class="related-type">({{ rel.type }})</span>
            </div>
          </div>
          
          <!-- Entity description if available -->
          <div v-if="item.description" class="result-description">{{ item.description }}</div>
        </li>
      </ul>
      
      <!-- Pagination controls, only shown when there are multiple pages -->
      <div v-if="totalPages > 1" class="pagination-container">
        <button 
          @click="prevPage" 
          class="pagination-button" 
          :disabled="currentPage === 1"
        >
          Previous
        </button>
        
        <div class="pagination-info">
          Page {{ currentPage }} of {{ totalPages }}
        </div>
        
        <button 
          @click="nextPage" 
          class="pagination-button" 
          :disabled="currentPage === totalPages"
        >
          Next
        </button>
      </div>
      
      <!-- Collapsible raw JSON data display for debugging -->
      <details class="raw-json-details">
        <summary>Show Raw JSON Data</summary>
        <pre class="json-display">{{ JSON.stringify(results, null, 2) }}</pre>
      </details>
    </div>
  </div>
</template>

<script setup>
// Import necessary Vue and third-party libraries
import { ref, computed, nextTick, onBeforeUnmount } from 'vue';
import api from '../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useRouter } from 'vue-router';

// Initialize Vue Router for navigation
const router = useRouter();

// Reactive state variables
const searchQuery = ref('');           // Current search input
const lastSearchQuery = ref('');       // Previous search query (for display)
const loading = ref(false);            // Loading state flag
const error = ref(null);               // Error message (if any)
const results = ref(null);             // Raw search results
const mapContainer = ref(null);        // Reference to map container element
const hasCoordinates = ref(false);     // Flag to track if any results have coordinates
let map = null;                        // Leaflet map instance
let markers = [];                      // Array to store map markers

// Pagination state
const currentPage = ref(1);            // Current page number
const itemsPerPage = 10;               // Number of items per page

/**
 * Normalizes text by removing accents and diacritics
 * Helps with case-insensitive searching of Spanish text
 * @param {string} text - The text to normalize
 * @returns {string} Normalized text without accents in lowercase
 */
const normalizeText = (text) => {
  return text
    .normalize('NFD')                 // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
    .toLowerCase();                   // Convert to lowercase
};

/**
 * Formats raw SPARQL query results into a more usable structure
 * Extracts entity information, coordinates, and relationships
 */
const formattedResults = computed(() => {
  if (!results.value || !results.value.results || !results.value.results.bindings) {
    return [];
  }
  
  return results.value.results.bindings.map(binding => {
    // Extract basic info
    const result = {
      label: binding.entityLabel?.value || binding.personLabel?.value || 'Unnamed Entity',
      coordinates: null,
      description: binding.description?.value || null,
      related: [],
      personName: binding.personLabel?.value || null,
      relationType: binding.relationType?.value || 'Related to',
      entityType: binding.label?.value || 'Entity',
      // Residence information
      residence: binding.residenceLabel?.value || null,
      residenceCoordinates: null,
      // Score information for matching
      score: binding.score?.value ? parseFloat(binding.score.value) : 0,
      // Store the original binding for details view
      rawData: binding
    };
    
    // Add entity's own coordinates if available
    if (binding.coord_raw) {
      const coords = parseWKT(binding.coord_raw.value);
      if (coords) {
        result.coordinates = `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`;
        result.coords = coords; // Store parsed coordinates
      }
    }
    
    // Add residence coordinates if available
    if (binding.resCoord_raw) {
      const resCoords = parseWKT(binding.resCoord_raw.value);
      if (resCoords) {
        result.residenceCoordinates = `${resCoords.lat.toFixed(4)}, ${resCoords.lon.toFixed(4)}`;
        result.resCoords = resCoords; // Store parsed coordinates
      }
    }
    
    // Add related person/entity information
    if (binding.personLabel && binding.personLabel.value) {
      result.related.push({
        name: binding.personLabel.value,
        type: 'Person',
        relation: binding.relationType?.value || 'Related to'
      });
    }
    
    return result;
  });
});

/**
 * Calculates the total number of results returned from the SPARQL query
 */
const resultsCount = computed(() => {
  if (!results.value || !results.value.results || !results.value.results.bindings) {
    return 0;
  }
  return results.value.results.bindings.length;
});

/**
 * Calculates the total number of pages based on results count and page size
 */
const totalPages = computed(() => {
  return Math.ceil(formattedResults.value.length / itemsPerPage);
});

/**
 * Returns the current page's subset of results for pagination
 * Slices the formatted results array based on current page and items per page
 */
const paginatedResults = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return formattedResults.value.slice(startIndex, endIndex);
});

/**
 * Converts a page-relative index to an absolute index in the full results array
 * Used to find the correct result when viewing details
 * @param {number} pageIndex - Index within the current page
 * @returns {number} Absolute index in the full results array
 */
const computedIndex = (pageIndex) => {
  return (currentPage.value - 1) * itemsPerPage + pageIndex;
};

/**
 * Navigates to the next page of results
 * Increments the current page and scrolls to the top
 */
const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

/**
 * Navigates to the previous page of results
 * Decrements the current page and scrolls to the top
 */
const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

/**
 * Navigates to the details page for a specific result item
 * Stores the selected result in localStorage and navigates using Vue Router
 * @param {Object} item - The formatted result item
 * @param {number} index - The absolute index in the full results array
 */
const viewDetails = (item, index) => {
  // Store the selected result in localStorage for the details page
  localStorage.setItem('selectedResult', JSON.stringify({
    item: item,
    rawData: results.value.results.bindings[index],
    searchQuery: lastSearchQuery.value
  }));
  
  // Navigate to the details page
  router.push({ 
    name: 'result-details',
    params: { 
      id: index
    }
  });
};

/**
 * Initializes the Leaflet map for geographic visualization
 * Creates a new map instance if one doesn't exist
 * @returns {boolean} True if map initialization was successful
 */
const initMap = async () => {
  // Clean up any existing map
  if (map) {
    map.remove();
    map = null;
  }
  
  // Wait for the next DOM update cycle to ensure the container is rendered
  await nextTick();
  
  if (!mapContainer.value) {
    console.error("Map container element not found");
    return false;
  }
  
  try {
    // Create the map with a specific ID
    map = L.map('geo-search-map').setView([0, 0], 2);
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);
    
    // Force a map re-render by invalidating size after a short delay
    // This helps with proper display when map container is conditionally rendered
    setTimeout(() => {
      if (map) map.invalidateSize();
    }, 200);
    
    return true;
  } catch (err) {
    console.error("Error initializing map:", err);
    return false;
  }
};

/**
 * Removes all markers from the map
 * Used to clear the map before adding new markers
 */
const clearMarkers = () => {
  if (!map) return;
  
  markers.forEach(marker => {
    try {
      map.removeLayer(marker);
    } catch (err) {
      console.error("Error removing marker:", err);
    }
  });
  markers = [];
};

/**
 * Parses WKT (Well-Known Text) coordinate format from Wikidata/SPARQL
 * Extracts latitude and longitude from Point(lon lat) format
 * @param {string} wkt - WKT coordinate string
 * @returns {Object|null} Object with lat and lon properties, or null if parsing fails
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
 * Processes SPARQL results to extract geographic data for map visualization
 * Identifies direct entity coordinates and residence coordinates
 * @param {Object} data - Raw SPARQL query results
 * @returns {Object} Object containing points array and locationsByCoord Map
 */
const processResults = (data) => {
  if (!data || !data.results || !data.results.bindings) {
    return { points: [], locationsByCoord: new Map() };
  }
  
  const points = [];
  const locationsByCoord = new Map();
  
  data.results.bindings.forEach(binding => {
    // Check for direct entity coordinates
    if (binding.coord_raw) {
      const coords = parseWKT(binding.coord_raw.value);
      
      if (coords) {
        const { lat, lon } = coords;
        const coordKey = `${lat},${lon}`;
        
        // Store info for this location
        if (!locationsByCoord.has(coordKey)) {
          locationsByCoord.set(coordKey, {
            coords: [lat, lon],
            entities: [],
            isResidence: false
          });
        }
        
        // Add entity info
        locationsByCoord.get(coordKey).entities.push({
          personLabel: binding.personLabel?.value || null,
          entityLabel: binding.entityLabel?.value || 'Unknown Entity',
          label: binding.label?.value || 'Location'
        });
        
        points.push([lat, lon]);
      }
    }
    
    // Check for residence coordinates
    if (binding.resCoord_raw) {
      const resCoords = parseWKT(binding.resCoord_raw.value);
      
      if (resCoords) {
        const { lat, lon } = resCoords;
        const coordKey = `${lat},${lon}`;
        
        // Store info for this residence
        if (!locationsByCoord.has(coordKey)) {
          locationsByCoord.set(coordKey, {
            coords: [lat, lon],
            entities: [],
            isResidence: true
          });
        }
        
        // Add residence info
        locationsByCoord.get(coordKey).entities.push({
          personLabel: binding.personLabel?.value || null,
          entityLabel: binding.residenceLabel?.value || 'Unknown Residence',
          label: 'Residence'
        });
        
        points.push([lat, lon]);
      }
    }
  });
  
  return { points, locationsByCoord };
};

// Add markers to the map
const addMarkers = (locationsByCoord) => {
  if (!map) return;
  
  locationsByCoord.forEach(location => {
    const [lat, lon] = location.coords;
    
    // Create popup content with all entities at this location
    let popupContent = '<div class="marker-popup">';
    location.entities.forEach(entity => {
      const personInfo = entity.personLabel ? `<strong>${entity.personLabel}</strong>: ` : '';
      const locationLabel = location.isResidence ? 'Residence' : entity.label;
      popupContent += `<p>${personInfo}${entity.entityLabel} (${locationLabel})</p>`;
    });
    popupContent += '</div>';
    
    // Use different colors for residences vs regular entities
    let markerColor = location.isResidence ? '#e74c3c' : '#3498db'; // Red for residence, blue for entity
    
    try {
      // Create marker with popup
      const marker = L.circleMarker([lat, lon], {
        radius: 8,
        fillColor: markerColor,
        color: '#fff',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(map)
        .bindPopup(popupContent);
      
      markers.push(marker);
    } catch (err) {
      console.error("Error adding marker:", err);
    }
  });
};

// Fit the map to show all points
const fitMapToPoints = (points) => {
  if (!map || !points.length) return;
  
  try {
    if (points.length === 1) {
      map.setView(points[0], 10);
    } else {
      map.fitBounds(points);
    }
    
    // Force a map re-render
    map.invalidateSize();
  } catch (err) {
    console.error("Error fitting map to bounds:", err);
  }
};

// Main function to execute the search
const executeSearch = async () => {
  if (!searchQuery.value.trim()) {
    error.value = "Please enter a search term";
    return;
  }
  
  loading.value = true;
  error.value = null;
  results.value = null;
  lastSearchQuery.value = searchQuery.value.trim();
  currentPage.value = 1; // Reset to first page for new search
  
  try {
    // Sanitize and normalize the search term to handle accents
    const sanitizedTerm = lastSearchQuery.value.replace(/'/g, "\\'"); // Escape single quotes for SPARQL
    const normalizedTerm = lastSearchQuery.value.toLowerCase()
      .replace(/á/g, 'a').replace(/é/g, 'e')
      .replace(/í/g, 'i').replace(/ó/g, 'o')
      .replace(/ú/g, 'u');
      
    console.log(`Searching for: "${lastSearchQuery.value}" (normalized: "${normalizedTerm}")`);
    
    // Generate initial query without federated parts
    let initialQuery = `
PREFIX wb: <https://medievalcharterskg.wikibase.cloud/entity/>
PREFIX wbt: <https://medievalcharterskg.wikibase.cloud/prop/direct/>
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX schema: <http://schema.org/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX p: <https://medievalcharterskg.wikibase.cloud/prop/>

SELECT DISTINCT ?entity ?entityLabel ?person ?personLabel ?residence ?residenceLabel ?wdItem ?residenceWdItem ?label ?rgb ?relation ?relationType ?score WHERE {
  {
    # Search for entities directly matching the search term
    ?entity rdfs:label ?entityLabel .
    
    # Use normalized versions of text for comparison
    BIND(LCASE(?entityLabel) AS ?lowerLabel)
    BIND(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(?lowerLabel, 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u') AS ?normalizedLabel)
    
    # Score calculation for relevance ranking
    BIND(
      IF(STRSTARTS(?lowerLabel, LCASE('${sanitizedTerm}')), 100, 0) + 
      IF(STRENDS(?lowerLabel, LCASE('${sanitizedTerm}')), 50, 0) + 
      IF(CONTAINS(?lowerLabel, LCASE('${sanitizedTerm}')), 75, 0) + 
      IF(STRSTARTS(?normalizedLabel, '${normalizedTerm}'), 90, 0) + 
      IF(STRENDS(?normalizedLabel, '${normalizedTerm}'), 40, 0) + 
      IF(CONTAINS(?normalizedLabel, '${normalizedTerm}'), 65, 0) +
      (10 / (1 + ABS(STRLEN(?entityLabel) - STRLEN('${sanitizedTerm}'))))  # Bonus for length similarity
      AS ?score
    )
    
    # Filter to only include relevant results, ordered by score
    FILTER(CONTAINS(?normalizedLabel, '${normalizedTerm}') || CONTAINS(?lowerLabel, LCASE('${sanitizedTerm}')))
    
    # Get coordinates if possible - just bind Wikidata ID
    OPTIONAL {
      ?entity wbt:P2 ?wdEntity .
      BIND(IRI(CONCAT("http://www.wikidata.org/entity/", ?wdEntity)) AS ?wdItem)
    }
    
    # Check for place of residence
    OPTIONAL {
      ?entity wbt:P55 ?residence .
      ?residence rdfs:label ?residenceLabel .
      
      # Get coordinates for the residence if available
      OPTIONAL {
        ?residence wbt:P2 ?residenceWdEntity .
        BIND(IRI(CONCAT("http://www.wikidata.org/entity/", ?residenceWdEntity)) AS ?residenceWdItem)
      }
    }
    
    BIND("Entity" AS ?relationType)
    BIND("00a2ff" AS ?rgb)
    BIND("Location" AS ?label)
  } 
  UNION 
  {
    # Search for people matching the search term
    ?person rdfs:label ?personLabel .
    
    # Use normalized versions of text for comparison
    BIND(LCASE(?personLabel) AS ?lowerPersonLabel)
    BIND(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(?lowerPersonLabel, 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u') AS ?normalizedPersonLabel)
    
    # Score calculation for relevance ranking
    BIND(
      IF(STRSTARTS(?lowerPersonLabel, LCASE('${sanitizedTerm}')), 100, 0) + 
      IF(STRENDS(?lowerPersonLabel, LCASE('${sanitizedTerm}')), 50, 0) + 
      IF(CONTAINS(?lowerPersonLabel, LCASE('${sanitizedTerm}')), 75, 0) + 
      IF(STRSTARTS(?normalizedPersonLabel, '${normalizedTerm}'), 90, 0) + 
      IF(STRENDS(?normalizedPersonLabel, '${normalizedTerm}'), 40, 0) + 
      IF(CONTAINS(?normalizedPersonLabel, '${normalizedTerm}'), 65, 0) +
      (10 / (1 + ABS(STRLEN(?personLabel) - STRLEN('${sanitizedTerm}'))))  # Bonus for length similarity
      AS ?score
    )
    
    # Filter to only include relevant results
    FILTER(CONTAINS(?normalizedPersonLabel, '${normalizedTerm}') || CONTAINS(?lowerPersonLabel, LCASE('${sanitizedTerm}')))
    
    # Look for place of residence
    OPTIONAL {
      ?person wbt:P55 ?residence .
      ?residence rdfs:label ?residenceLabel .
      
      # Get coordinates for the residence if available
      OPTIONAL {
        ?residence wbt:P2 ?residenceWdEntity .
        BIND(IRI(CONCAT("http://www.wikidata.org/entity/", ?residenceWdEntity)) AS ?residenceWdItem)
      }
    }
    
    # Get all entities related to this person - limit to important properties
    ?person ?relation ?entity .
    
    # Filter out certain predicate types to reduce result size
    FILTER (?relation != rdfs:label && ?relation != schema:description)
    
    # Get the type of relation (property) between person and entity
    OPTIONAL {
      ?relation rdfs:label ?relationLabel .
      BIND(?relationLabel AS ?relationType)
    }
    
    # Get coordinates for the entity if available
    OPTIONAL {
      ?entity wbt:P2 ?wdEntity .
      BIND(IRI(CONCAT("http://www.wikidata.org/entity/", ?wdEntity)) AS ?wdItem)
    }
    
    BIND("ff5500" AS ?rgb)
    BIND("Person" AS ?label)
  }
  
  # Get labels for all entities
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "[AUTO_LANGUAGE],es,en" .
  }
}
ORDER BY DESC(?score)
LIMIT 100`;

    // Execute initial query without coordinates
    console.log('Executing initial search query');
    const response = await api.sparqlQuery(initialQuery);
    results.value = response.data;
    console.log(`Found ${response.data.results.bindings.length} entities in initial search`);
    
    // Log the top 3 results with their scores
    if (response.data.results.bindings.length > 0) {
      console.log("Top results with scores:");
      response.data.results.bindings.slice(0, 3).forEach((binding, index) => {
        console.log(`${index + 1}. ${binding.entityLabel?.value || binding.personLabel?.value} - Score: ${binding.score?.value || 'N/A'}`);
      });
    }
    
    // Only if we have results, fetch the coordinates
    if (response.data.results.bindings.length > 0) {
      // Extract Wikidata IDs from the results
      const wdItems = new Set();
      const residenceWdItems = new Set();
      
      response.data.results.bindings.forEach(binding => {
        if (binding.wdItem && binding.wdItem.value) {
          wdItems.add(binding.wdItem.value);
        }
        if (binding.residenceWdItem && binding.residenceWdItem.value) {
          residenceWdItems.add(binding.residenceWdItem.value);
        }
      });
      
      console.log(`Found ${wdItems.size} entity IDs and ${residenceWdItems.size} residence IDs`);
      
      // If we have Wikidata items, execute coordinate queries
      if (wdItems.size > 0 || residenceWdItems.size > 0) {
        // Get entity coordinates
        if (wdItems.size > 0) {
          // Build entity coordinates query
          const wdItemsValues = Array.from(wdItems).map(item => `<${item}>`).join(' ');
          const entityCoordsQuery = `
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
SELECT ?wdItem ?coord_raw WHERE {
  VALUES ?wdItem { ${wdItemsValues} }
  ?wdItem wdt:P625 ?coord_raw .
}
LIMIT 100`;
          
          try {
            console.log('Executing entity coordinates query');
            const entityCoordsResponse = await api.sparqlQuery(entityCoordsQuery);
            
            // Merge entity coordinates into results
            if (entityCoordsResponse.data && entityCoordsResponse.data.results && entityCoordsResponse.data.results.bindings) {
              entityCoordsResponse.data.results.bindings.forEach(binding => {
                if (binding.wdItem && binding.coord_raw) {
                  const itemId = binding.wdItem.value;
                  results.value.results.bindings.forEach(resultBinding => {
                    if (resultBinding.wdItem && resultBinding.wdItem.value === itemId) {
                      resultBinding.coord_raw = { value: binding.coord_raw.value, type: 'literal' };
                    }
                  });
                }
              });
              
              console.log(`Retrieved coordinates for ${entityCoordsResponse.data.results.bindings.length} entities`);
            }
          } catch (err) {
            console.error('Error fetching entity coordinates:', err);
            // Continue execution - we can still show results without coordinates
          }
        }
        
        // Get residence coordinates
        if (residenceWdItems.size > 0) {
          // Build residence coordinates query
          const residenceWdItemsValues = Array.from(residenceWdItems).map(item => `<${item}>`).join(' ');
          const residenceCoordsQuery = `
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
SELECT ?residenceWdItem ?resCoord_raw WHERE {
  VALUES ?residenceWdItem { ${residenceWdItemsValues} }
  ?residenceWdItem wdt:P625 ?resCoord_raw .
}
LIMIT 100`;
          
          try {
            console.log('Executing residence coordinates query');
            const residenceCoordsResponse = await api.sparqlQuery(residenceCoordsQuery);
            
            // Merge residence coordinates into results
            if (residenceCoordsResponse.data && residenceCoordsResponse.data.results && residenceCoordsResponse.data.results.bindings) {
              residenceCoordsResponse.data.results.bindings.forEach(binding => {
                if (binding.residenceWdItem && binding.resCoord_raw) {
                  const itemId = binding.residenceWdItem.value;
                  results.value.results.bindings.forEach(resultBinding => {
                    if (resultBinding.residenceWdItem && resultBinding.residenceWdItem.value === itemId) {
                      resultBinding.resCoord_raw = { value: binding.resCoord_raw.value, type: 'literal' };
                    }
                  });
                }
              });
              
              console.log(`Retrieved coordinates for ${residenceCoordsResponse.data.results.bindings.length} residences`);
            }
          } catch (err) {
            console.error('Error fetching residence coordinates:', err);
            // Continue execution - we can still show results without coordinates
          }
        }
      }
    }
    
    // Process results for map display
    const { points } = processResults(results.value);
    hasCoordinates.value = points.length > 0;
    console.log(`Found ${points.length} coordinate points in total`);
  } catch (err) {
    console.error("Search error details:", err.response?.data || err.message);
    error.value = err.response?.data?.message || "Error performing search";
    console.error("Search error:", err);
  } finally {
    loading.value = false;
  }
};

// Helper function to get match quality text based on score
const getMatchQuality = (score) => {
  if (score > 180) return 'Excellent match';
  if (score > 150) return 'Very good match';
  if (score > 120) return 'Good match';
  if (score > 90) return 'Fair match';
  if (score > 60) return 'Partial match';
  return 'Weak match';
};

// Clean up resources when component is unmounted
onBeforeUnmount(() => {
  if (map) {
    clearMarkers();
    map.remove();
    map = null;
  }
});
</script>

<style scoped>
.geo-search-container {
  width: 100%;
  max-width: 800px;
  margin: 20px auto;
  padding: 0 15px;
  text-align: left;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 140px); /* Adjust for header/footer */
  box-sizing: border-box; /* Include padding in the width calculation */
}

@media (max-width: 768px) {
  .geo-search-container {
    height: calc(100vh - 120px);
    padding: 0 10px;
    margin: 10px auto;
  }
  
  .search-button {
    min-width: 100px;
    padding: 10px 12px;
  }
}

@media (max-width: 480px) {
  .geo-search-container {
    height: calc(100vh - 100px);
    margin: 5px auto;
  }
  
  .search-button {
    min-width: 90px;
    padding: 10px 8px;
    font-size: 14px;
  }
  
  .search-input {
    padding: 10px 12px;
    font-size: 14px;
  }
}

h2, h3 {
  margin-bottom: 15px;
  color: #2c3e50;
}

.search-input-container {
  display: flex;
  margin-bottom: 20px;
  width: 100%;
}

.search-input {
  flex: 1;
  padding: 12px 15px;
  border: 2px solid #ddd;
  border-radius: 4px 0 0 4px;
  font-size: 16px;
  outline: none;
  min-width: 0; /* Prevents input from overflowing */
}

.search-input:focus {
  border-color: #3498db;
}

.search-button {
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
  white-space: nowrap;
  min-width: 120px; /* Ensure minimum width for the button */
}

.search-button:hover:not(:disabled) {
  background-color: #2980b9;
}

.search-button:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.search-status {
  margin: 10px 0;
  font-weight: bold;
  text-align: left;
}

.error {
  color: #e74c3c;
}

.results-container {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #ddd;
  color: #333;
  text-align: left;
  margin-top: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.json-display {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  max-height: 200px;
  overflow-y: auto;
}

/* Results list styling */
.no-results {
  padding: 15px;
  color: #777;
  font-style: italic;
}

.results-list {
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}

.result-item {
  padding: 15px;
  border-bottom: 1px solid #e1e4e8;
  cursor: pointer;
  transition: background-color 0.2s;
  border-radius: 4px;
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:hover {
  background-color: #eaf2f8;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.result-title {
  font-weight: bold;
  font-size: 18px;
  color: #2c3e50;
  margin-bottom: 5px;
  flex: 1;
  margin-right: 10px;
}

.result-type-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.result-type {
  font-size: 14px;
  color: #777;
}

.result-relevance {
  width: 80px;
  height: 4px;
  background-color: #eee;
  border-radius: 2px;
  overflow: hidden;
}

.relevance-indicator {
  display: block;
  height: 100%;
  background-color: #3498db;
  border-radius: 2px;
}

.high-relevance {
  border-left: 4px solid #2ecc71;
  background-color: rgba(46, 204, 113, 0.05);
}

.medium-relevance {
  border-left: 4px solid #f39c12;
  background-color: rgba(243, 156, 18, 0.05);
}

.low-relevance {
  border-left: 4px solid #95a5a6;
}

.high-relevance .result-title {
  color: #27ae60;
}

.result-coordinates {
  color: #3498db;
  font-size: 14px;
  margin-bottom: 5px;
}

.result-residence {
  margin-bottom: 5px;
}

.relation-label {
  font-weight: bold;
  color: #2c3e50;
}

.residence-name {
  margin-left: 5px;
  color: #555;
}

.result-residence-coordinates {
  color: #3498db;
  font-size: 14px;
  margin-bottom: 5px;
}

.result-related-person {
  margin-bottom: 5px;
}

.person-name {
  margin-left: 5px;
  color: #555;
}

.result-related {
  margin-top: 5px;
}

.related-item {
  margin-bottom: 5px;
}

.related-name {
  margin-left: 5px;
  color: #555;
}

.related-type {
  font-size: 12px;
  color: #777;
}

.result-description {
  margin: 5px 0;
  color: #555;
}

.match-quality {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: #f8f9fa;
  color: #666;
  white-space: nowrap;
}

.high-relevance .match-quality {
  background-color: rgba(46, 204, 113, 0.2);
  color: #27ae60;
}

.medium-relevance .match-quality {
  background-color: rgba(243, 156, 18, 0.2);
  color: #d35400;
}

.low-relevance .match-quality {
  background-color: rgba(149, 165, 166, 0.2);
  color: #7f8c8d;
}

/* Pagination styling */
.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding: 15px 0;
  border-top: 1px solid #e1e4e8;
}

.pagination-button {
  background-color: #f7f9fc;
  color: #3498db;
  border: 1px solid #e1e4e8;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.pagination-button:hover:not(:disabled) {
  background-color: #eaf2f8;
  border-color: #3498db;
}

.pagination-button:disabled {
  color: #ccc;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 14px;
  color: #666;
}

.raw-json-details {
  margin-top: 20px;
  border-top: 1px solid #e1e4e8;
  padding-top: 15px;
}

.raw-json-details summary {
  cursor: pointer;
  color: #3498db;
  font-weight: bold;
  margin-bottom: 10px;
}

.location-icon {
  font-style: normal;
}

/* Marker popup styling */
:deep(.marker-popup) {
  max-width: 300px;
}

:deep(.marker-popup p) {
  margin: 5px 0;
}
</style> 