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

// Initialize navigateToPlugin in plugin registry for plugin actions
pluginRegistry.setNavigateToPlugin((pluginId: string) => {
  router.push({ name: pluginId });
});

export default router;
