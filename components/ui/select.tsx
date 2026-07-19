import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Lightweight styled native <select> — no popover dependency, works everywhere. */
export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <div className="relative inline-flex">
      <select
        ref={ref}
        className={cn(
          "h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-9 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 opacity-60" />
    </div>
  )
);
Select.displayName = "Select";

export { Select };
