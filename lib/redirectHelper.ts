import { PERMISSIONS } from './permissions';

const navigationRoutes = [
  { name: 'Dashboard', href: '/dashboard', requiredPermission: PERMISSIONS.DASHBOARD_ACCESS },
  { name: 'Farmers', href: '/farmers', requiredPermission: PERMISSIONS.FARMERS_READ },
  { name: 'Agents', href: '/agents', requiredPermission: PERMISSIONS.AGENTS_READ },
  { name: 'Clusters', href: '/clusters', requiredPermission: PERMISSIONS.CLUSTERS_READ },
  { name: 'Farms', href: '/farms', requiredPermission: PERMISSIONS.FARMS_READ },
  { name: 'Users', href: '/users', requiredPermission: PERMISSIONS.USERS_READ },
  { name: 'Roles', href: '/roles', requiredPermission: PERMISSIONS.ROLES_READ },
  { name: 'GIS', href: '/gis-map-google', requiredPermission: PERMISSIONS.GIS_VIEW },
  { name: 'Settings', href: '/settings', requiredPermission: PERMISSIONS.SETTINGS_READ },
];

export function getFirstAvailableRoute(hasPermission: (permission: string) => boolean): string {
  if (typeof hasPermission !== 'function') {
    console.warn('getFirstAvailableRoute: hasPermission is not a function');
    return '/auth/signin';
  }

  for (const route of navigationRoutes) {
    if (hasPermission(route.requiredPermission)) {
      return route.href;
    }
  }

  return '/auth/signin?error=no_permissions';
}

export function getAvailableRoutes(hasPermission: (permission: string) => boolean) {
  if (typeof hasPermission !== 'function') {
    return [];
  }

  return navigationRoutes.filter(route => hasPermission(route.requiredPermission));
}
