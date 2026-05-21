// Permission constants - Single source of truth
// This file must NOT import from permissions.ts or rolePermissions.ts
// to avoid circular dependencies.
export const PERMISSIONS = {
  // Users
  USERS_CREATE: 'users.create',
  USERS_READ: 'users.read',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  // Agents
  AGENTS_CREATE: 'agents.create',
  AGENTS_READ: 'agents.read',
  AGENTS_UPDATE: 'agents.update',
  AGENTS_DELETE: 'agents.delete',
  // Farmers
  FARMERS_CREATE: 'farmers.create',
  FARMERS_READ: 'farmers.read',
  FARMERS_UPDATE: 'farmers.update',
  FARMERS_DELETE: 'farmers.delete',
  FARMERS_EXPORT: 'farmers.export',

  // Farms
  FARMS_CREATE: 'farms.create',
  FARMS_READ: 'farms.read',
  FARMS_UPDATE: 'farms.update',
  FARMS_DELETE: 'farms.delete',
  FARMS_IMPORT: 'farms.import',
  FARMS_EXPORT: 'farms.export',
  // Clusters
  CLUSTERS_CREATE: 'clusters.create',
  CLUSTERS_READ: 'clusters.read',
  CLUSTERS_UPDATE: 'clusters.update',
  CLUSTERS_DELETE: 'clusters.delete',
  // Certificates
  CERTIFICATES_CREATE: 'certificates.create',
  CERTIFICATES_READ: 'certificates.read',
  CERTIFICATES_UPDATE: 'certificates.update',
  CERTIFICATES_DELETE: 'certificates.delete',
  // Roles
  ROLES_CREATE: 'roles.create',
  ROLES_READ: 'roles.read',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  // Analytics
  ANALYTICS_READ: 'analytics.read',
  // Dashboard
  DASHBOARD_ACCESS: 'dashboard.access',
  // GIS
  GIS_VIEW: 'gis.view',
  GIS_EDIT: 'gis.edit',
  GIS_EXPORT: 'gis.export',
  GIS_ANALYZE: 'gis.analyze',
  // Settings
  SETTINGS_READ: 'settings.read',
  SETTINGS_UPDATE: 'settings.update',

  // Requests
  REQUESTS_READ: 'requests.read',
  REQUESTS_MANAGE: 'requests.manage',

  // Surveys
  SURVEYS_CREATE: 'surveys.create',
  SURVEYS_READ: 'surveys.read',
  SURVEYS_UPDATE: 'surveys.update',
  SURVEYS_DELETE: 'surveys.delete',
  SURVEYS_RESPONSES_READ: 'surveys.responses.read',

  // Corrections audit
  CORRECTIONS_READ: 'corrections.read',

  // Communications
  COMMUNICATIONS_SEND: 'communications.send',
  COMMUNICATIONS_READ: 'communications.read',

  // System Administration
  SYSTEM_MANAGE_PERMISSIONS: 'system.manage_permissions',
  SYSTEM_MANAGE_ROLES: 'system.manage_roles',
  SYSTEM_VIEW_LOGS: 'system.view_logs',
  SYSTEM_MANAGE_BACKUPS: 'system.manage_backups',
  SYSTEM_MANAGE_INTEGRATIONS: 'system.manage_integrations',
};
