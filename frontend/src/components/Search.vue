<!--
  Search.vue - Main search component for the Medieval Charters Knowledge Graph
  This component allows users to search for medieval entities (people, places) and
  displays results with pagination, relevance indicators, and geographic information.
-->
<template>
  <div class="geo-search-container">
    <h2>Search Entities</h2>
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
    
    <!-- Results container -->
    <div v-if="showDetails && selectedResult" class="details-container">
      <component 
        :is="getComponentForType(selectedResult)"
        :details="selectedResult"
        @back="handleBack"
      />
    </div>
    
    <div v-else-if="lastSearchQuery" class="results-container">
      <h3>Results ({{ resultsCount }})</h3>
      
      <!-- No results message -->
      <div v-if="resultsCount === 0" class="no-results">
        No results found for "{{ lastSearchQuery }}".
      </div>
      
      <!-- Results list -->
      <ul v-else class="results-list">
        <li 
          v-for="(item, index) in paginatedResults" 
          :key="index" 
          class="result-item"
          @click="handleResultClick(item)"
          role="button"
          tabindex="0"
        >
          <div class="result-header">
            <div class="result-title">{{ item.label }}</div>
            <div class="result-id">ID: {{ item.id }}</div>
          </div>
          <div v-if="item.description" class="result-description">
            {{ item.description }}
          </div>
        </li>
      </ul>
      
      <!-- Pagination controls -->
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
    </div>
  </div>
</template>

<script setup>
// Import necessary Vue and third-party libraries
import { ref, computed, nextTick, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import ResultDetails from './ResultDetails.vue';
import PersonResultDetails from './PersonResultDetails.vue';
import PlaceResultDetails from './PlaceResultDetails.vue';
import ActivitiesResultDetails from './ActivitiesResultDetails.vue';

// Initialize Vue Router for navigation
const router = useRouter();

// Define emits
const emit = defineEmits(['showDetails']);

// Reactive state variables
const searchQuery = ref('');           // Current search input
const lastSearchQuery = ref('');       // Previous search query (for display)
const loading = ref(false);            // Loading state flag
const error = ref(null);               // Error message (if any)
const results = ref(null);             // Raw search results
const selectedResult = ref(null);       // Selected entity details
const showDetails = ref(false);         // Flag to show details

// Pagination state
const currentPage = ref(1);            // Current page number
const itemsPerPage = 10;               // Number of items per page

// Computed properties for pagination
const resultsCount = computed(() => {
  if (!results.value || !results.value.search) {
    return 0;
  }
  return results.value.search.length;
});

const totalPages = computed(() => {
  return Math.ceil(resultsCount.value / itemsPerPage);
});

const paginatedResults = computed(() => {
  if (!results.value || !results.value.search) {
    return [];
  }
  const startIndex = (currentPage.value - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return results.value.search.slice(startIndex, endIndex);
});

// Pagination methods
const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

// Add this after the imports
const isDevelopment = process.env.NODE_ENV === 'development';

const debugLog = (...args) => {
  if (isDevelopment) {
    console.log(...args);
  }
};

// Add method to handle result click
const handleResultClick = async (item) => {
  try {
    debugLog('Clicked item:', item);
    const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/searchProperties/${item.id}`);
    debugLog('Properties response:', response.data);
    
    selectedResult.value = {
      item: item,
      properties: response.data
    };
    showDetails.value = true;
  } catch (error) {
    console.error('Error fetching properties:', error);
  }
};

const handleBack = () => {
  showDetails.value = false;
  selectedResult.value = null;
};

const getComponentForType = (details) => {
  debugLog('getComponentForType called with details:', details);
  
  if (!details?.properties?.results?.bindings) {
    debugLog('No properties found, using ResultDetails');
    return ResultDetails;
  }
  
  // Find the binding that has the instance of label
  const instanceOfBinding = details.properties.results.bindings.find(
    binding => binding.instanceOfLabel?.value
  );
  
  debugLog('Found instance of binding:', instanceOfBinding);
  
  if (!instanceOfBinding?.instanceOfLabel?.value) {
    debugLog('No instance of value found, using ResultDetails');
    return ResultDetails;
  }
  
  const type = instanceOfBinding.instanceOfLabel.value.toLowerCase();
  debugLog('Entity type:', type);
  
  if (type.includes('person')) {
    debugLog('Using PersonResultDetails');
    return PersonResultDetails;
  }
  if (type.includes('place')) {
    debugLog('Using PlaceResultDetails');
    return PlaceResultDetails;
  }
  if (type.includes('activity')) {
    debugLog('Using ActivitiesResultDetails');
    return ActivitiesResultDetails;
  }
  
  debugLog('No specific type match, using ResultDetails');
  return ResultDetails;
};

// Main search function
const executeSearch = async () => {
  if (!searchQuery.value.trim()) {
    error.value = "Please enter a search term";
    return;
  }
  
  loading.value = true;
  error.value = null;
  results.value = null;
  selectedResult.value = null;
  lastSearchQuery.value = searchQuery.value.trim();
  currentPage.value = 1;
  
  try {
    const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/search?query=${encodeURIComponent(lastSearchQuery.value)}`);
    
    if (!response.data.search) {
      throw new Error("No results found");
    }
    
    results.value = response.data;
    
  } catch (err) {
    console.error("Search error:", err);
    error.value = err.message || "Error performing search";
  } finally {
    loading.value = false;
  }
};

const props = defineProps({
  initialQuery: {
    type: String,
    default: ''
  }
});
</script>

<style scoped>
@import '../grayscale.css';

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
  color: var(--text-primary);
}

.search-input-container {
  display: flex;
  margin-bottom: 20px;
  width: 100%;
}

.search-input {
  flex: 1;
  padding: 12px 15px;
  border: 2px solid var(--border-light);
  border-radius: 4px 0 0 4px;
  font-size: 16px;
  outline: none;
  min-width: 0; /* Prevents input from overflowing */
  background-color: var(--gray-100);
  color: var(--text-primary);
}

.search-input:focus {
  border-color: var(--accent-medium);
}

.search-button {
  padding: 10px 20px;
  background-color: var(--accent-dark);
  color: var(--gray-100);
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
  white-space: nowrap;
  min-width: 120px; /* Ensure minimum width for the button */
}

.search-button:hover:not(:disabled) {
  background-color: var(--accent-medium);
}

.search-button:disabled {
  background-color: var(--gray-400);
  cursor: not-allowed;
}

.search-status {
  margin: 10px 0;
  font-weight: bold;
  text-align: left;
  color: var(--text-secondary);
}

.error {
  color: var(--error);
}

.results-container {
  background-color: var(--bg-primary);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid var(--border-light);
  color: var(--text-primary);
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
  color: var(--text-primary);
  max-height: 200px;
  overflow-y: auto;
}

/* Results list styling */
.no-results {
  padding: 15px;
  color: var(--text-light);
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
  border-bottom: 1px solid #eee;
  margin-bottom: 10px;
  border-radius: 4px;
  background-color: #f8f9fa;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.result-item:hover {
  background-color: #e9ecef;
}

.result-item:focus {
  outline: 2px solid #2c3e50;
  outline-offset: 2px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.result-title {
  font-weight: bold;
  font-size: 18px;
  color: var(--text-primary);
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
  color: var(--text-light);
}

.result-relevance {
  width: 80px;
  height: 4px;
  background-color: var(--gray-200);
  border-radius: 2px;
  overflow: hidden;
}

.relevance-indicator {
  display: block;
  height: 100%;
  background-color: var(--accent-medium);
}

.match-quality {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  background-color: var(--gray-200);
  color: var(--text-secondary);
}

.high-relevance .match-quality {
  background-color: var(--accent-light);
  color: var(--accent-dark);
}

.medium-relevance .match-quality {
  background-color: var(--gray-300);
  color: var(--gray-600);
}

.result-coordinates, 
.result-residence-coordinates,
.result-residence,
.result-related-person,
.result-description {
  margin-top: 8px;
  font-size: 14px;
  color: var(--text-secondary);
}

.location-icon {
  font-style: normal;
  margin-right: 5px;
}

.relation-label {
  font-weight: bold;
  color: var(--text-secondary);
  margin-right: 5px;
}

.residence-name, 
.person-name {
  color: var(--text-primary);
}

.result-related {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--border-light);
}

.related-item {
  margin-bottom: 5px;
  font-size: 14px;
}

.related-name {
  color: var(--text-primary);
}

.related-type {
  color: var(--text-light);
  font-size: 12px;
  margin-left: 5px;
}

.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid var(--border-light);
}

.pagination-button {
  padding: 8px 16px;
  background-color: var(--gray-200);
  border: 1px solid var(--border-light);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary);
  transition: all 0.2s;
}

.pagination-button:hover:not(:disabled) {
  background-color: var(--accent-light);
  border-color: var(--accent-medium);
}

.pagination-button:disabled {
  background-color: var(--gray-200);
  color: var(--gray-400);
  cursor: not-allowed;
  border-color: var(--border-light);
}

.pagination-info {
  font-size: 14px;
  color: var(--text-secondary);
}

.raw-json-details {
  margin-top: 20px;
  padding-top: 10px;
  border-top: 1px solid var(--border-light);
}

.raw-json-details summary {
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 10px;
}

.raw-json-details summary:hover {
  color: var(--accent-dark);
}
</style> 