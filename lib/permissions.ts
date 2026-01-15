import prisma from './prisma';

// Permission constants - Single source of truth
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

  // System Administration
  SYSTEM_MANAGE_PERMISSIONS: 'system.manage_permissions',
  SYSTEM_MANAGE_ROLES: 'system.manage_roles',
  SYSTEM_VIEW_LOGS: 'system.view_logs',
  SYSTEM_MANAGE_BACKUPS: 'system.manage_backups',
  SYSTEM_MANAGE_INTEGRATIONS: 'system.manage_integrations',
};

// Get user permissions from database
export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              select: {
                permissions: true,
                isSystem: true,
                name: true
              }
            }
          }
        }
      }
    });

    // Check for Super Admin emails
    const SUPER_ADMINS = ['admin@cosmopolitan.edu.ng', 'rislan@cosmopolitan.edu.ng'];

    // We need to fetch the user's email first if we only have the ID
    let userEmail = '';
    if (userWithRoles) {
      userEmail = userWithRoles.email.toLowerCase();
    } else {
      // Fallback if userWithRoles is null (though we just found it) or if we need to fetch separately
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (user) userEmail = user.email.toLowerCase();
    }

    if (SUPER_ADMINS.includes(userEmail)) {
      return Object.values(PERMISSIONS);
    }

    if (!userWithRoles) {
      return [];
    }

    // Collect all permissions from all assigned roles
    const permissions = new Set<string>();

    // Also include the role directly assigned to the user (legacy support)
    // Map the string role to permissions using ROLE_PERMISSIONS fallback logic if needed
    // But ideally we rely on the DB roles.

    userWithRoles.userRoles.forEach(userRole => {
      // In Prisma, JSON fields are typed as JsonValue, which can be anything.
      // We need to cast or check it.
      const rolePermissions = userRole.role.permissions as string[] | null;

      if (rolePermissions && Array.isArray(rolePermissions)) {
        rolePermissions.forEach(permission => {
          permissions.add(permission);
        });
      }
    });

    return Array.from(permissions);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

// Check if user has specific permission (async - fetches from DB)
export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(permission);
}
