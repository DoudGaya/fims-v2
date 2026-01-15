"use client"

import * as React from "react"
import Image from "next/image"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map as MapIcon,
  PieChart,
  Settings2,
  SquareTerminal,
  Home,
  ChartBar,
  Users,
  Building,
  FileText,
  ShieldCheck,
  Globe,
  Settings,
  Leaf,
  BriefcaseBusiness
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import logo from '@/public/ccsa-logo.png'
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { usePermissions } from "./PermissionProvider"
import { PERMISSIONS } from "@/lib/permissions"
import { useSession } from "next-auth/react"

// Navigation items with permissions
const navigationConfig = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: Home,
    requiredPermission: PERMISSIONS.DASHBOARD_ACCESS
  },
  {
    title: 'Analytics',
    url: '/analytics',
    icon: ChartBar,
    requiredPermission: PERMISSIONS.DASHBOARD_ACCESS
  },
  {
    title: 'Farmers',
    url: '/farmers',
    icon: Users,
    requiredPermission: PERMISSIONS.FARMERS_READ
  },
  {
    title: 'Agents',
    url: '/agents',
    icon: BriefcaseBusiness, // UserGroup equivalent
    requiredPermission: PERMISSIONS.AGENTS_READ
  },
  {
    title: 'Clusters',
    url: '/clusters',
    icon: Building,
    requiredPermission: PERMISSIONS.CLUSTERS_READ
  },
  {
    title: 'Farms',
    url: '/farms',
    icon: Leaf, // Farms equivalent
    requiredPermission: PERMISSIONS.FARMS_READ
  },
  {
    title: 'Certificates',
    url: '/certificates',
    icon: FileText,
    requiredPermission: PERMISSIONS.CERTIFICATES_READ
  },
  {
    title: 'Users',
    url: '/users',
    icon: Users,
    requiredPermission: PERMISSIONS.USERS_READ
  },
  // {
  //   title: 'Roles',
  //   url: '/roles',
  //   icon: ShieldCheck,
  //   requiredPermission: PERMISSIONS.ROLES_READ
  // },
  {
    title: 'GIS Map',
    url: '/gis-map-google',
    icon: Globe,
    requiredPermission: PERMISSIONS.GIS_VIEW
  },
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings,
    requiredPermission: PERMISSIONS.SETTINGS_READ
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();
  const { hasPermission } = usePermissions();

  // Filter navigation based on permissions
  const filteredNav = navigationConfig.filter((item) => {
    if (!item.requiredPermission) return true;
    return hasPermission(item.requiredPermission);
  });

  const userData = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: (session?.user as any)?.image || "",
  };

  const teams = [
    {
      name: "CCSA FIMS",
      logo: logo,
      plan: "Enterprise",
    }
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Image src={logo} className=" h-12 object-contain items-start object-left" alt="CCSA FIMS" />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNav} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
