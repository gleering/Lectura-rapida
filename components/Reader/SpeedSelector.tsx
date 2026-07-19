"use client";

import { Select } from "@/components/ui/select";
import { SPEED_OPTIONS, type Speed } from "@/types";

interface SpeedSelectorProps {
  speed: Speed;
  onChange: (speed: Speed) => void;
}

/** Instant speed change — no debounce, applies to the running engine at once. */
export function SpeedSelector({ speed, onChange }: SpeedSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Select
        value={speed}
        onChange={(e) => onChange(Number(e.target.value) as Speed)}
        aria-label="Velocidad de lectura"
        className="w-[130px] bg-white/10 text-white border-white/20"
      >
        {SPEED_OPTIONS.map((s) => (
          <option key={s} value={s} className="text-black">
            {s} ppm
          </option>
        ))}
      </Select>
    </div>
  );
}
