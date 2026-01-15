'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { PERMISSIONS } from '@/lib/permissions';

// Role-based default permissions - matches ROLE.md specifications
// This is used as a fallback if database permissions are not available
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: Object.values(PERMISSIONS), // Full access to everything
  admin: [
    // Users - Full CRUD
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_DELETE,
    // Agents - Full CRUD
    PERMISSIONS.AGENTS_CREATE,
    PERMISSIONS.AGENTS_READ,
    PERMISSIONS.AGENTS_UPDATE,
    PERMISSIONS.AGENTS_DELETE,
    // Farmers - Full CRUD + Export
    PERMISSIONS.FARMERS_CREATE,
    PERMISSIONS.FARMERS_READ,
    PERMISSIONS.FARMERS_UPDATE,
    PERMISSIONS.FARMERS_DELETE,
    PERMISSIONS.FARMERS_EXPORT,
    // Farms - Full CRUD + Export/Import
    PERMISSIONS.FARMS_CREATE,
    PERMISSIONS.FARMS_READ,
    PERMISSIONS.FARMS_UPDATE,
    PERMISSIONS.FARMS_DELETE,
    PERMISSIONS.FARMS_EXPORT,
    // PERMISSIONS.FARMS_IMPORT, // Not in PERMISSIONS constant yet?
    // GIS - Full Access
    // PERMISSIONS.GIS_VIEW, // Not in PERMISSIONS constant yet?
    // PERMISSIONS.GIS_EDIT,
    // PERMISSIONS.GIS_EXPORT,
    // PERMISSIONS.GIS_ANALYZE,
    // Clusters - Full CRUD
    PERMISSIONS.CLUSTERS_CREATE,
    PERMISSIONS.CLUSTERS_READ,
    PERMISSIONS.CLUSTERS_UPDATE,
    PERMISSIONS.CLUSTERS_DELETE,
    // Certificates - Full CRUD
    PERMISSIONS.CERTIFICATES_CREATE,
    PERMISSIONS.CERTIFICATES_READ,
    PERMISSIONS.CERTIFICATES_UPDATE,
    PERMISSIONS.CERTIFICATES_DELETE,
    // Analytics - Read only
    PERMISSIONS.ANALYTICS_READ,
    // Dashboard - Full Access
    // PERMISSIONS.DASHBOARD_ACCESS, // Not in PERMISSIONS constant yet?
    // Settings - Read and Update
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.SETTINGS_UPDATE,
    // System - No system permissions for admin (only super_admin)
  ],
  manager: [
    // Agents - Read only
    PERMISSIONS.AGENTS_READ,
    // Farmers - Read and Update
    PERMISSIONS.FARMERS_READ,
    PERMISSIONS.FARMERS_UPDATE,
    // Farms - Read and Update
    PERMISSIONS.FARMS_READ,
    PERMISSIONS.FARMS_UPDATE,
    // GIS - View only
    // PERMISSIONS.GIS_VIEW,
    // Clusters - Read and Update
    PERMISSIONS.CLUSTERS_READ,
    PERMISSIONS.CLUSTERS_UPDATE,
    // Analytics - Read only
    PERMISSIONS.ANALYTICS_READ,
  ],
  agent: [
    // Farmers - Create, Read, Update
    PERMISSIONS.FARMERS_CREATE,
    PERMISSIONS.FARMERS_READ,
    PERMISSIONS.FARMERS_UPDATE,
    // Farms - Create, Read, Update
    PERMISSIONS.FARMS_CREATE,
    PERMISSIONS.FARMS_READ,
    PERMISSIONS.FARMS_UPDATE,
    // GIS - View only
    // PERMISSIONS.GIS_VIEW,
    // Clusters - Read only
    PERMISSIONS.CLUSTERS_READ,
  ],
  viewer: [
    // Farmers - Read only
    PERMISSIONS.FARMERS_READ,
    // Farms - Read only
    PERMISSIONS.FARMS_READ,
    // GIS - View only
    // PERMISSIONS.GIS_VIEW,
    // Clusters - Read only
    PERMISSIONS.CLUSTERS_READ,
    // Analytics - Read only
    PERMISSIONS.ANALYTICS_READ,
  ],
};

interface PermissionContextType {
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissionList: string[]) => boolean;
  hasAllPermissions: (permissionList: string[]) => boolean;
  role: string | null;
  loading: boolean;
}

const PermissionContext = createContext<PermissionContextType>({
  permissions: [],
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
  role: null,
  loading: true,
});

interface PermissionProviderProps {
  children: ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const { data: session, status } = useSession();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    if (session?.user) {
      // Use permissions directly from session (fetched from database)
      const sessionPermissions = (session.user as any).permissions || [];

      // Fallback to role-based permissions if no database permissions
      if (sessionPermissions.length === 0) {
        const userRole = (session.user as any).role;
        const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
        setPermissions(rolePermissions);
      } else {
        setPermissions(sessionPermissions);
      }
    } else {
      setPermissions([]);
    }

    setLoading(false);
  }, [session, status]);

  const hasPermission = (permission: string) => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList: string[]) => {
    return permissionList.some((permission) => permissions.includes(permission));
  };

  const hasAllPermissions = (permissionList: string[]) => {
    return permissionList.every((permission) => permissions.includes(permission));
  };

  const value = {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    role: (session?.user as any)?.role || null,
    loading: loading || status === 'loading',
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}

interface PermissionGateProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  role?: string;
  roles?: string[];
}

export function PermissionGate({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  role,
  roles,
}: PermissionGateProps) {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    role: userRole,
  } = usePermissions();

  // Check role-based access
  if (role && userRole !== role) {
    return fallback;
  }

  if (roles && userRole && !roles.includes(userRole)) {
    return fallback;
  }

  // Check permission-based access
  if (permission && !hasPermission(permission)) {
    return fallback;
  }

  if (permissions && permissions.length > 0) {
    const hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasAccess) {
      return fallback;
    }
  }

  return <>{children}</>;
}

// HOC for page-level permission checking
export function withPermissions<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredPermissions: string[] = [],
  options: { requireAll?: boolean; fallback?: ReactNode } = {}
) {
  return function PermissionWrappedComponent(props: P) {
    const { hasAnyPermission, hasAllPermissions, loading } = usePermissions();
    const { requireAll = false, fallback = <div>Access denied</div> } = options;

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    const hasAccess = requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);

    if (!hasAccess) {
      return <>{fallback}</>;
    }

    return <WrappedComponent {...props} />;
  };
}

export default PermissionProvider;
