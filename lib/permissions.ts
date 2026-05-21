import prisma from './prisma';
import { ROLE_PERMISSIONS } from './rolePermissions';
import { PERMISSIONS } from './permissionConstants';
export { PERMISSIONS };

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

    if (!userWithRoles) {
      return [];
    }

    // Collect all permissions from all assigned roles.
    // Also merge in ROLE_PERMISSIONS defaults so that newly-added permission
    // constants work immediately without requiring a DB role update.
    const permissions = new Set<string>();

    // Merge role-based defaults first (lowest precedence)
    const legacyRole: string | undefined = (userWithRoles as any).role;
    if (legacyRole && ROLE_PERMISSIONS[legacyRole]) {
      ROLE_PERMISSIONS[legacyRole].forEach(p => permissions.add(p));
    }

    userWithRoles.userRoles.forEach(userRole => {
      // Merge role-name defaults
      const roleName = userRole.role.name;
      if (roleName && ROLE_PERMISSIONS[roleName]) {
        ROLE_PERMISSIONS[roleName].forEach(p => permissions.add(p));
      }

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
