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
// Supports optional route parameter for plugin-level sub-routes
// Route names follow the pattern: "pluginId:routeName" (e.g., "ai-chat-plugin:main", "ai-chat-plugin:models")
// When no route is specified, defaults to "pluginId:main"
pluginRegistry.setNavigateToPlugin((pluginId: string, route?: string, query?: Record<string, string>) => {
  const routeName = route ? `${pluginId}:${route}` : `${pluginId}:main`;
  router.push({ name: routeName, query });
});

export default router;
