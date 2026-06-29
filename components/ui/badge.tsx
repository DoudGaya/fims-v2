import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#02426F] focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-[#013358] text-white hover:bg-[#02426F]",
                secondary:
                    "border-[#DCEAF3] bg-[#F3F8FC] text-[#013358] hover:bg-[#DCEAF3]",
                destructive:
                    "border-transparent bg-[#EF4444] text-white hover:bg-red-600",
                outline: "border-[#DCEAF3] text-[#475569]",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
