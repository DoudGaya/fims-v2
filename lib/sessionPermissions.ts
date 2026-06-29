import { getUserPermissions } from './permissions';
import { ROLE_PERMISSIONS } from './rolePermissions';

export type SessionUserPermissions = {
  id?: string;
  role?: string | null;
  roles?: Array<{ name?: string | null }> | null;
  permissions?: string[] | null;
};

function getRoleDefaults(roleName?: string | null) {
  if (!roleName) return [];
  return ROLE_PERMISSIONS[roleName] || ROLE_PERMISSIONS[roleName.toLowerCase()] || [];
}

export async function resolveSessionPermissions(user?: SessionUserPermissions | null) {
  const permissions = new Set<string>();

  if (Array.isArray(user?.permissions)) {
    user.permissions.forEach((permission) => permissions.add(permission));
  }

  getRoleDefaults(user?.role).forEach((permission) => permissions.add(permission));

  if (Array.isArray(user?.roles)) {
    user.roles.forEach((role) => {
      getRoleDefaults(role.name).forEach((permission) => permissions.add(permission));
    });
  }

  if (user?.id) {
    const freshPermissions = await getUserPermissions(user.id);
    freshPermissions.forEach((permission) => permissions.add(permission));
  }

  return Array.from(permissions);
}
