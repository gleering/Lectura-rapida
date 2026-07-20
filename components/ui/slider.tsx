import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onValueChange?: (value: number) => void;
}

/** Styled native range input. */
const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, onValueChange, ...props }, ref) => (
    <input
      ref={ref}
      type="range"
      className={cn(
        "h-3 w-full cursor-pointer touch-none appearance-none rounded-full bg-secondary accent-primary",
        className
      )}
      onChange={(e) => onValueChange?.(Number(e.target.value))}
      {...props}
    />
  )
);
Slider.displayName = "Slider";

export { Slider };
