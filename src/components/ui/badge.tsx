import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-brand-primary text-brand-text hover:bg-brand-accent",
        secondary:
          "border-transparent bg-brand-surface text-brand-primary hover:bg-brand-accent",
        destructive:
          "border-transparent bg-brand-danger text-brand-text hover:bg-brand-danger/80",
        outline: "text-brand-text border-brand-border",
        success:
          "border-transparent bg-brand-success text-brand-success-foreground border-brand-success",
        warning:
          "border-transparent bg-brand-warning text-brand-warning-foreground border-brand-warning",
        info:
          "border-transparent bg-brand-accent text-brand-accent-foreground border-brand-accent",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-0.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
