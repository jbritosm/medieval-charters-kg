import { createRouter, createWebHistory } from 'vue-router';
import GeoSearch from '../components/GeoSearch.vue';
import ResultDetails from '../components/ResultDetails.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: GeoSearch
  },
  {
    path: '/result/:id',
    name: 'result-details',
    component: ResultDetails
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router; 