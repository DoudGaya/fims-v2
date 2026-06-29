import { PERMISSIONS } from './permissionConstants';

/**
 * Role-based default permissions — matches ROLE.md specifications.
 *
 * This map is the single source of truth for which permissions each
 * named role should have.  It is used:
 *   • Server-side  – getUserPermissions() merges these in so the API
 *     honours new permissions immediately without requiring a DB migration.
 *   • Client-side  – PermissionProvider merges these with session
 *     permissions so the UI reflects changes before the JWT refreshes.
 */
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
    // Settings - Read and Update
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.SETTINGS_UPDATE,
    // Requests - Read and Manage
    PERMISSIONS.REQUESTS_READ,
    PERMISSIONS.REQUESTS_MANAGE,
    // Surveys - Full CRUD + Responses
    PERMISSIONS.SURVEYS_CREATE,
    PERMISSIONS.SURVEYS_READ,
    PERMISSIONS.SURVEYS_UPDATE,
    PERMISSIONS.SURVEYS_DELETE,
    PERMISSIONS.SURVEYS_RESPONSES_READ,
    // Corrections - Read audit history
    PERMISSIONS.CORRECTIONS_READ,
    // Communications - Send and read
    PERMISSIONS.COMMUNICATIONS_SEND,
    PERMISSIONS.COMMUNICATIONS_READ,
    // Agri-Business - Full operational access
    PERMISSIONS.AGRIBUSINESS_CREATE,
    PERMISSIONS.AGRIBUSINESS_READ,
    PERMISSIONS.AGRIBUSINESS_UPDATE,
    PERMISSIONS.AGRIBUSINESS_REVIEW_KYB,
    PERMISSIONS.AGRIBUSINESS_MANAGE_AGREEMENTS,
    PERMISSIONS.AGRIBUSINESS_MANAGE_OUTREACH,
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
    // Clusters - Read and Update
    PERMISSIONS.CLUSTERS_READ,
    PERMISSIONS.CLUSTERS_UPDATE,
    // Analytics - Read only
    PERMISSIONS.ANALYTICS_READ,
    // Requests - Read only
    PERMISSIONS.REQUESTS_READ,
    // Communications - Read only
    PERMISSIONS.COMMUNICATIONS_READ,
    // Agri-Business - Manage partner pipeline but not system settings
    PERMISSIONS.AGRIBUSINESS_CREATE,
    PERMISSIONS.AGRIBUSINESS_READ,
    PERMISSIONS.AGRIBUSINESS_UPDATE,
    PERMISSIONS.AGRIBUSINESS_MANAGE_OUTREACH,
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
    // Clusters - Read only
    PERMISSIONS.CLUSTERS_READ,
  ],
  viewer: [
    // Farmers - Read only
    PERMISSIONS.FARMERS_READ,
    // Farms - Read only
    PERMISSIONS.FARMS_READ,
    // Clusters - Read only
    PERMISSIONS.CLUSTERS_READ,
    // Analytics - Read only
    PERMISSIONS.ANALYTICS_READ,
    // Agri-Business - Read only
    PERMISSIONS.AGRIBUSINESS_READ,
  ],
};
