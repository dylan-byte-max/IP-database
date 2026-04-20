import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'Home', component: () => import('../views/HomeView.vue') },
  { path: '/ip/:id', name: 'Detail', component: () => import('../views/DetailView.vue') },
  { path: '/upload', name: 'Upload', component: () => import('../views/UploadView.vue') },
  { path: '/analytics', name: 'Analytics', component: () => import('../views/AnalyticsView.vue') },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
