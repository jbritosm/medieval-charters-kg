<template>
  <div class="place-details" v-if="details">
    <div class="details-header">
      <div class="header-actions">
        <button @click="$emit('back')" class="back-button">
          ← Back to Results
        </button>
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
    <Map v-if="hasCoordinates" :coordinates="coordinates" />

    <div class="properties-container">
      <h3>Place Information</h3>
      <div v-if="!hasProperties" class="no-properties">
        No information found for this place.
      </div>
      <div v-else class="properties-list">
        <div v-for="(binding, index) in details.properties.results.bindings" 
             :key="index" 
             class="property-item">
          <div class="property-name">{{ binding.propertyLabel.value }}</div>
          <div class="property-value">{{ binding.valueLabel.value }}</div>
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
  debugLog('All bindings:', props.details?.properties?.results?.bindings);
  const binding = props.details?.properties?.results?.bindings?.find(
    b => {
      debugLog('Checking binding:', b);
      debugLog('Has coord?', !!b.coord);
      debugLog('Coord value:', b.coord?.value);
      return b.coord?.value;
    }
  );
  debugLog('Found binding with coordinates:', binding);
  return binding?.coord?.value;
});

const hasCoordinates = computed(() => {
  const hasCoords = !!coordinates.value;
  debugLog('Has coordinates:', hasCoords);
  debugLog('Coordinates value:', coordinates.value);
  return hasCoords;
});
</script>

<style scoped>
.place-details {
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
</style> 