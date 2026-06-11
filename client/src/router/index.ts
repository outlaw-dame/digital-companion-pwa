/**
 * Router Configuration
 * 
 * Phase 11: Frontend Architecture Enforcement
 * 
 * All routes are defined here with their corresponding components.
 * 
 * Architecture Rules:
 * - Route components are in src/views/
 * - Route components use semantic components only
 * - No direct Framework7 imports in route components
 * - No direct Capacitor imports in route components
 * - No direct Iconoir imports in route components
 */

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import HomeView from '@/views/HomeView.vue';
import WelcomeView from '@/views/WelcomeView.vue';
import SignInView from '@/views/SignInView.vue';
import ExploreView from '@/views/ExploreView.vue';
import ThreadView from '@/views/ThreadView.vue';
import StoryView from '@/views/StoryView.vue';
import MessagesView from '@/views/MessagesView.vue';
import ConversationView from '@/views/ConversationView.vue';
import NotificationsView from '@/views/NotificationsView.vue';
import ProfileView from '@/views/ProfileView.vue';
import SettingsView from '@/views/SettingsView.vue';
import MediaView from '@/views/MediaView.vue';
import NotFoundView from '@/views/NotFoundView.vue';
import ErrorView from '@/views/ErrorView.vue';

// Route definitions
const routes: RouteRecordRaw[] = [
  // Authentication routes
  {
    path: '/welcome',
    name: 'welcome',
    component: WelcomeView,
    meta: { requiresGuest: true, title: 'Welcome' },
  },
  {
    path: '/signin',
    name: 'signin',
    component: SignInView,
    meta: { requiresGuest: true, title: 'Sign In' },
  },
  
  // Main app routes
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { requiresAuth: true, title: 'Home' },
  },
  {
    path: '/explore',
    name: 'explore',
    component: ExploreView,
    meta: { requiresAuth: true, title: 'Explore' },
  },
  
  // Content routes
  {
    path: '/thread/:id',
    name: 'thread',
    component: ThreadView,
    meta: { requiresAuth: true, title: 'Thread' },
    props: true,
  },
  {
    path: '/story/:id',
    name: 'story',
    component: StoryView,
    meta: { requiresAuth: true, title: 'Story' },
    props: true,
  },
  
  // Messaging routes
  {
    path: '/messages',
    name: 'messages',
    component: MessagesView,
    meta: { requiresAuth: true, title: 'Messages' },
  },
  {
    path: '/messages/:conversationId',
    name: 'conversation',
    component: ConversationView,
    meta: { requiresAuth: true, title: 'Conversation' },
    props: true,
  },
  
  // Social routes
  {
    path: '/notifications',
    name: 'notifications',
    component: NotificationsView,
    meta: { requiresAuth: true, title: 'Notifications' },
  },
  
  // User routes
  {
    path: '/profile/:username?',
    name: 'profile',
    component: ProfileView,
    meta: { requiresAuth: true, title: 'Profile' },
    props: true,
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    meta: { requiresAuth: true, title: 'Settings' },
  },
  
  // Media routes
  {
    path: '/media/:id',
    name: 'media',
    component: MediaView,
    meta: { requiresAuth: true, title: 'Media' },
    props: true,
  },
  
  // Error routes
  {
    path: '/404',
    name: 'not-found',
    component: NotFoundView,
    meta: { title: 'Not Found' },
  },
  {
    path: '/error',
    name: 'error',
    component: ErrorView,
    meta: { title: 'Error' },
  },
  
  // Catch-all 404
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
  },
];

// Create router
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: (to, from, savedPosition) => {
    // Always scroll to top on navigation
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' };
    }
    return { top: 0, behavior: 'smooth' };
  },
});

// Navigation guards
router.beforeEach(async (to, from, next) => {
  // Get auth store
  const { useAuthStore } = await import('@/stores/useAuthStore');
  const authStore = useAuthStore();
  
  // Set page title
  if (to.meta.title) {
    document.title = `${to.meta.title} - ANE`;
  }
  
  // Check auth requirements
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // Redirect to welcome if not authenticated
    return next('/welcome');
  }
  
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    // Redirect to home if already authenticated
    return next('/');
  }
  
  // Continue
  next();
});

// After navigation
router.afterEach((to, from) => {
  // Track page view
  if (import.meta.env.DEV) {
    console.log(`Navigated to: ${to.path}`);
  }
});

export default router;
