'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { ROLE_PERMISSIONS } from '@/lib/rolePermissions';

export { ROLE_PERMISSIONS };

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

      // Merge session permissions with role-based defaults so new permissions
      // added to ROLE_PERMISSIONS are available even before the token refreshes
      const userRole = (session.user as any).role;
      const roleDefaults = ROLE_PERMISSIONS[userRole] || [];
      const merged = Array.from(new Set([...sessionPermissions, ...roleDefaults]));
      setPermissions(merged);
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
