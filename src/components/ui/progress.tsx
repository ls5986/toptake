import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

interface ProgressProps extends
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  variant?: "default" | "success" | "warning" | "error"
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, variant = "default", ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-brand-surface/40",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "h-full w-full flex-1 transition-all duration-300 ease-in-out",
        variant === "default" && "bg-brand-primary",
        variant === "success" && "bg-brand-success",
        variant === "warning" && "bg-brand-warning",
        variant === "error" && "bg-brand-danger",
      )}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
