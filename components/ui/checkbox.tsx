import * as React from "react"

import { cn } from "@/lib/utils"

type CheckboxProps = React.ComponentPropsWithoutRef<"input">

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      data-slot="checkbox"
      className={cn(
        "h-4 w-4 rounded border border-input text-primary shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
