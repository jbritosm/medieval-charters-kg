import { createRouter, createWebHistory } from 'vue-router';
import Search from '../components/Search.vue';
import ResultDetails from '../components/ResultDetails.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: Search
  },
  {
    path: '/result/:id',
    name: 'result-details',
    component: ResultDetails
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

export default router; 