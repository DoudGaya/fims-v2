import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b border-[#E5E7EB] bg-white/95 shadow-[0_1px_12px_rgba(1,51,88,0.04)] backdrop-blur transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 dark:border-white/10 dark:bg-card/90">
          <div className="flex flex-1 items-center gap-3 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-5 bg-[#DCEAF3]" />
            <DynamicBreadcrumb />
          </div>
          <div className="px-4">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 bg-[#F8FAFC] px-4 pb-6 pt-0 dark:bg-background sm:px-6 lg:px-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
