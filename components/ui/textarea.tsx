import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-[#DCEAF3] placeholder:text-[#94A3B8] focus-visible:border-[#02426F] focus-visible:ring-[#02426F]/20 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-28 w-full rounded-md border bg-white px-3.5 py-3 text-base text-[#1E293B] shadow-xs transition-[color,box-shadow,border-color] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
