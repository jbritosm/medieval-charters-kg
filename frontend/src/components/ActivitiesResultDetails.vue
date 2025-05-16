<template>
  <div class="activities-details" v-if="details">
    <div class="details-header">
      <div class="header-actions">
        <button @click="$emit('back')" class="back-button">
          ← Back to Results
        </button>
        <a :href="`https://medievalcharterskg.wikibase.cloud/entity/${details.item.id}`" 
           target="_blank" 
           rel="noopener noreferrer"
           class="wikibase-button">
          View in Wikibase
        </a>
        <button @click="showJson = !showJson" class="toggle-json-button">
          {{ showJson ? 'Hide' : 'Show' }} JSON
        </button>
      </div>
      <h2>{{ details.item.label }}</h2>
      <div class="entity-id">ID: {{ details.item.id }}</div>
      <div v-if="details.item.description" class="entity-description">
        {{ details.item.description }}
      </div>
    </div>

    <!-- JSON Debug Info -->
    <div v-if="showJson" class="json-debug">
      <pre>{{ JSON.stringify(details, null, 2) }}</pre>
    </div>

    <!-- Map component -->
    <div v-if="hasCoordinates" class="map-section">
      <Map v-if="hasCoordinates" :coordinates="coordinates" />
    </div>

    <div class="properties-container">
      <h3>Activity Information</h3>
      <div v-if="!hasProperties" class="no-properties">
        No information found for this activity.
      </div>
      <div v-else class="properties-list">
        <div v-for="(binding, index) in details.properties.results.bindings" 
             :key="index" 
             class="property-item">
          <div class="property-name">{{ binding.propertyLabel.value }}</div>
          <div class="property-value" :class="{ 
            'scrollable-list': hasMultipleValues(binding.propertyLabel.value),
            'scrollable': shouldBeScrollable(binding.propertyLabel.value)
          }">
            <template v-if="hasMultipleValues(binding.propertyLabel.value)">
              <ul>
                <li v-for="(valueBinding, valueIndex) in getValuesForProperty(binding.propertyLabel.value)" 
                    :key="valueIndex">
                  {{ valueBinding.valueLabel.value }}
                </li>
              </ul>
            </template>
            <template v-else>
              {{ binding.valueLabel.value }}
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import Map from './Map.vue';

const props = defineProps({
  details: {
    type: Object,
    required: true
  }
});

defineEmits(['back']);

const showJson = ref(false);

const isDevelopment = process.env.NODE_ENV === 'development';

const debugLog = (...args) => {
  if (isDevelopment) {
    console.log(...args);
  }
};

const hasProperties = computed(() => {
  debugLog('Checking properties:', props.details?.properties);
  return props.details?.properties?.results?.bindings?.length > 0;
});

const coordinates = computed(() => {
  if (!props.details?.properties?.results?.bindings) return null;
  
  // First check if it's a place (placeCoord)
  const placeBinding = props.details.properties.results.bindings.find(b => b.placeCoord?.value);
  if (placeBinding?.placeCoord?.value) {
    const [lat, lon] = placeBinding.placeCoord.value.replace('Point(', '').replace(')', '').split(' ');
    return { lat: parseFloat(lat), lng: parseFloat(lon) };
  }
  
  // If not a place, check for residence coordinates (coord)
  const coordBinding = props.details.properties.results.bindings.find(b => b.coord?.value);
  if (coordBinding?.coord?.value) {
    const [lat, lon] = coordBinding.coord.value.replace('Point(', '').replace(')', '').split(' ');
    return { lat: parseFloat(lat), lng: parseFloat(lon) };
  }
  
  return null;
});

const hasCoordinates = computed(() => {
  const hasCoords = !!coordinates.value;
  debugLog('Has coordinates:', hasCoords);
  debugLog('Coordinates value:', coordinates.value);
  return hasCoords;
});

const hasMultipleValues = (propertyName) => {
  return props.details.properties.results.bindings.filter(b => b.propertyLabel.value === propertyName).length > 1;
};

const shouldBeScrollable = (propertyName) => {
  return props.details.properties.results.bindings.filter(b => b.propertyLabel.value === propertyName).length > 5;
};

const getValuesForProperty = (propertyName) => {
  return props.details.properties.results.bindings.filter(b => b.propertyLabel.value === propertyName);
};
</script>

<style scoped>
.activities-details {
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
  border: 1px solid #ddd;
  max-height: 70vh;
  overflow-y: auto;
}

.header-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.back-button,
.toggle-json-button {
  padding: 8px 16px;
  background-color: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #2c3e50;
  transition: all 0.2s ease;
}

.back-button:hover,
.toggle-json-button:hover {
  background-color: #e9ecef;
  border-color: #2c3e50;
}

.json-debug {
  margin: 20px 0;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  overflow-x: auto;
  border: 1px solid #ddd;
}

.json-debug pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.details-header {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.details-header h2 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 24px;
}

.entity-id {
  font-size: 14px;
  color: #7f8c8d;
  margin-bottom: 10px;
}

.entity-description {
  font-size: 16px;
  color: #34495e;
  line-height: 1.4;
}

.properties-container {
  margin-top: 20px;
}

.properties-container h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 20px;
}

.no-properties {
  padding: 20px;
  text-align: center;
  color: #7f8c8d;
  font-style: italic;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.properties-list {
  display: grid;
  gap: 15px;
}

.property-item {
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #eee;
  transition: background-color 0.2s ease;
}

.property-item:hover {
  background-color: #e9ecef;
}

.property-name {
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 5px;
  font-size: 16px;
}

.property-value {
  color: #34495e;
  font-size: 15px;
  line-height: 1.4;
}

.property-value.scrollable-list {
  padding-right: 10px;
}

.property-value.scrollable-list.scrollable {
  max-height: 150px;
  overflow-y: auto;
}

.property-value.scrollable-list ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.property-value.scrollable-list li {
  padding: 5px 0;
  border-bottom: 1px solid #eee;
}

.property-value.scrollable-list li:last-child {
  border-bottom: none;
}

/* Custom scrollbar for the list */
.property-value.scrollable-list::-webkit-scrollbar {
  width: 6px;
}

.property-value.scrollable-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.property-value.scrollable-list::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.property-value.scrollable-list::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.wikibase-button {
  display: inline-block;
  padding: 8px 16px;
  background-color: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 4px;
  color: #2c3e50;
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;
  font-size: 14px;
}

.wikibase-button:hover {
  background-color: #e9ecef;
  border-color: #2c3e50;
}
</style> 