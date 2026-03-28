import { createRouter, createWebHistory } from 'vue-router';
import { SearchList } from '@spotlight/panel';
import { pluginRegistry } from '@spotlight/plugin-registry';
import { ROUTE_NAMES } from '@spotlight/core';
import { getPanelRoutes } from '../plugins';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: ROUTE_NAMES.SEARCH,
      component: SearchList,
    },
    ...getPanelRoutes(),
  ],
});

// Initialize router in plugin registry for dynamic route registration
pluginRegistry.setRouter(router);

export default router;
