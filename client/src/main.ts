/**
 * Main Entry Point
 * 
 * Phase 11: Frontend Architecture Enforcement
 * 
 * Architecture Rules:
 * - Only semantic components used
 * - No direct Framework7 imports in this file
 * - No direct Capacitor imports in this file
 * - No direct Iconoir imports in this file
 * - All imports follow architecture contract
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

// Import global CSS
import './assets/css/global.css';

// Create the Vue application
const app = createApp(App);

// Install Pinia (state management)
const pinia = createPinia();
app.use(pinia);

// Install Vue Router
app.use(router);

// Global error handler
app.config.errorHandler = (err, instance, info) => {
  // Import here to avoid circular dependency
  const { logger } = require('./utils/logging');
  
  logger.error('Global error', {
    error: err.message,
    component: instance?.$options.name,
    info,
  });
  
  // In production, you might want to report to error tracking service
  if (import.meta.env.PROD) {
    // reportError(err, instance, info);
  }
};

// Global warn handler
app.config.warnHandler = (msg, instance, trace) => {
  const { logger } = require('./utils/logging');
  
  logger.warn('Vue warning', {
    message: msg,
    component: instance?.$options.name,
    trace,
  });
};

// Mount the application
const appContainer = document.getElementById('app');

if (appContainer) {
  app.mount(appContainer);
} else {
  console.error('Failed to find #app element');
  throw new Error('Failed to find #app element');
}

// Export for testing
export { app, pinia, router };
