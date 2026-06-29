import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-[#94A3B8] selection:bg-[#013358] selection:text-white dark:bg-input/30 border-[#DCEAF3] h-11 w-full min-w-0 rounded-md border bg-white px-3.5 py-2 text-base text-[#1E293B] shadow-xs transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:text-foreground dark:bg-input/30",
        "focus-visible:border-[#02426F] focus-visible:ring-[#02426F]/20 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
