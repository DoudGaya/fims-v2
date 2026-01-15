'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  HomeIcon,
  ChartBarIcon,
  UsersIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  MapIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { usePermissions } from './PermissionProvider';
import { PERMISSIONS } from '@/lib/permissions';

// Navigation with permission requirements
const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, requiredPermission: PERMISSIONS.DASHBOARD_ACCESS },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, requiredPermission: PERMISSIONS.DASHBOARD_ACCESS },
  { name: 'Farmers', href: '/farmers', icon: UsersIcon, requiredPermission: PERMISSIONS.FARMERS_READ },
  { name: 'Agents', href: '/agents', icon: UserGroupIcon, requiredPermission: PERMISSIONS.AGENTS_READ },
  { name: 'Clusters', href: '/clusters', icon: BuildingOfficeIcon, requiredPermission: PERMISSIONS.CLUSTERS_READ },
  { name: 'Farms', href: '/farms', icon: GlobeAltIcon, requiredPermission: PERMISSIONS.FARMS_READ },
  { name: 'Certificates', href: '/certificates', icon: DocumentTextIcon, requiredPermission: PERMISSIONS.CERTIFICATES_READ },
  { name: 'Users', href: '/users', icon: UsersIcon, requiredPermission: PERMISSIONS.USERS_READ },
  { name: 'Roles', href: '/roles', icon: ShieldCheckIcon, requiredPermission: PERMISSIONS.ROLES_READ },
  { name: 'GIS (Google)', href: '/gis-map-google', icon: MapIcon, requiredPermission: PERMISSIONS.GIS_VIEW },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon, requiredPermission: PERMISSIONS.SETTINGS_READ },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function DashboardLayout({ children, title = 'CCSA FIMS' }: DashboardLayoutProps) {
  const { data: session } = useSession();
  const { hasPermission } = usePermissions();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Filter navigation based on user permissions
  const navigation = navigationItems.filter((item) => {
    if (!item.requiredPermission) return true; // No permission required
    return hasPermission(item.requiredPermission);
  });

  // Load sidebar collapsed state from localStorage
  useEffect(() => {
    const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    setSidebarCollapsed(collapsed);
  }, []);

  const handleSidebarToggle = () => {
    const newCollapsed = !sidebarCollapsed;
    setSidebarCollapsed(newCollapsed);
    localStorage.setItem('sidebarCollapsed', newCollapsed.toString());
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/auth/signin');
  };

  const getUserDisplayName = () => {
    if (session?.user?.name) {
      return session.user.name;
    }
    if (session?.user?.email) {
      return session.user.email.split('@')[0];
    }
    return 'User';
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-40 md:hidden">
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setSidebarOpen(false)}
          ></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>
            {/* Mobile navigation */}
            <div className="flex-1 h-0 pt-5 pb-4 p-3 overflow-y-auto">
              <div className="flex-shrink-0 bg-gray-200 rounded-lg py-2 flex items-center mb-5">
                <div className="ml-3 relative h-12 w-auto aspect-[3/1]">
                  <Image
                    src="/ccsa-logo.png"
                    alt="CCSA Logo"
                    fill
                    className="object-contain"
                    sizes="150px"
                  />
                </div>
              </div>
              <nav className="space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`${
                        isActive
                          ? 'bg-red-100 text-blue-950 rounded-lg'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } group flex items-center px-3 py-3 text-base font-medium transition-colors duration-200`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon
                        className={`${
                          isActive ? 'text-blue-950' : 'text-gray-400 group-hover:text-gray-500'
                        } mr-4 h-6 w-6 flex-shrink-0`}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            {/* Mobile user section */}
            <div className="flex-shrink-0 flex p-4">
              <div className="flex items-start w-full px-4 py-2 rounded-lg bg-gray-200">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-sm font-bold text-blue-950">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-8 stroke-blue-950"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />
                      </svg>
                    </span>
                  </div>
                </div>
                <div className="ml-3 flex items-end justify-start flex-col flex-1">
                  <p className="text-base font-medium text-gray-700 truncate">
                    {getUserDisplayName()}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {session?.user?.email}
                  </p>
                  <button
                    onClick={handleSignOut}
                    className="text-base bg-white px-4 mt-3 py-1 rounded-lg text-gray-700 hover:text-gray-700 flex items-center transition-colors duration-200"
                  >
                    <ArrowLeftOnRectangleIcon className="h-8 w-8 mr-1" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Static sidebar for desktop */}
      <div
        className={`hidden md:flex md:flex-shrink-0 transition-all duration-300 ${
          sidebarCollapsed ? 'md:w-20' : 'md:w-64'
        }`}
      >
        <div className="flex flex-col p-2 w-full">
          <div className="flex flex-col h-0 flex-1 bg-white rounded-lg border-r border-gray-200 p-2 shadow-sm">
            {/* Logo and collapse button */}
            <div
              className={`flex items-center justify-between flex-shrink-0 p-1 rounded-lg bg-gray-200 border-gray-200`}
            >
              <div className="flex items-center">
                {/* CCSA Logo */}
                {!sidebarCollapsed && (
                  <div className="ml-3 relative h-12 w-32">
                    <Image
                      src="/ccsa-logo.png"
                      alt="CCSA Logo"
                      fill
                      className="object-contain"
                      sizes="150px"
                      priority
                    />
                  </div>
                )}
              </div>
              <button
                onClick={handleSidebarToggle}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-white transition-colors duration-200"
              >
                {sidebarCollapsed ? (
                  <ChevronRightIcon className="h-5 w-5" />
                ) : (
                  <ChevronLeftIcon className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Navigation */}
            <nav className="mt-5 flex-1 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      isActive
                        ? 'bg-blue-950/10 text-black rounded-lg'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      sidebarCollapsed ? 'justify-center' : ''
                    }`}
                    title={sidebarCollapsed ? item.name : ''}
                  >
                    <item.icon
                      className={`${
                        isActive ? 'text-black' : 'text-gray-400 group-hover:text-gray-500'
                      } flex-shrink-0 h-5 w-5 ${sidebarCollapsed ? '' : 'mr-3'}`}
                    />
                    {!sidebarCollapsed && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* User section */}
            <div className="flex-shrink-0">
              <div className="">
                <div
                  className={`flex bg-gray-200 rounded-lg items-start justify-end ${
                    sidebarCollapsed ? 'justify-center' : ' px-3 py-2'
                  } mb-2 group relative`}
                >
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center shadow-sm">
                      <span className="text-sm font-bold text-white">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="stroke-blue-950 size-10"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>
                  {!sidebarCollapsed && (
                    <div className="ml-3 justify-end items-end flex flex-col flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {getUserDisplayName()}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {session?.user?.email}
                      </p>
                      <button
                        onClick={handleSignOut}
                        className="text-xs text-gray-500 hover:text-gray-700 flex items-center mt-1 transition-colors duration-200"
                      >
                        <ArrowLeftOnRectangleIcon className="h-3 w-3 mr-1" />
                        Sign out
                      </button>
                    </div>
                  )}
                  {sidebarCollapsed && (
                    <div className="absolute left-20 bottom-4 bg-gray-900 text-white p-2 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                      {getUserDisplayName()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col py-2 pr-3 w-0 flex-1 overflow-hidden">
        {/* Top navigation */}
        <div className="relative z-10 bg-white rounded-lg flex-shrink-0 flex h-16 shadow-sm border-b border-gray-200">
          <button
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500 md:hidden hover:bg-gray-50 transition-colors duration-200"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex-1 px-4 flex justify-between items-center">
            <div className="flex-1 flex">
              <div className="w-full flex md:ml-0">
                <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                  <div className="flex items-center h-full">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {title}
                    </h2>
                  </div>
                </div>
              </div>
            </div>

            <div className="ml-4 flex items-center md:ml-6 space-x-4">
              {/* Search bar (hidden on mobile) */}
              <div className="hidden md:block">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search farmers, agents..."
                    className="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500 text-sm"
                  />
                </div>
              </div>

              {/* User profile dropdown area */}
              <div className="flex items-center space-x-3">
                <div className="hidden md:flex flex-col items-end">
                  <div className="text-sm font-medium text-gray-900">
                    {getUserDisplayName()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(session?.user as any)?.role || 'Administrator'}
                  </div>
                </div>
                <div className="h-8 w-8 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-xs font-bold text-blue-950">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-8 "
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                      />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className=" w-full mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
