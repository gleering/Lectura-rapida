"use client";

import { Slider } from "@/components/ui/slider";
import { formatDuration, formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Speed } from "@/types";

interface ProgressBarProps {
  title: string;
  index: number;
  total: number;
  wordsPerPage: number;
  totalPages: number;
  speed: Speed;
  onSeek: (index: number) => void;
  /** Light tray (RSVP mockup) — dark text on a light surface. */
  light?: boolean;
}

/** The bottom info strip: book, estimated page, position, %, time remaining. */
export function ProgressBar({
  title,
  index,
  total,
  wordsPerPage,
  totalPages,
  speed,
  onSeek,
  light = false,
}: ProgressBarProps) {
  const current = Math.min(index + 1, total);
  const percent = total > 0 ? (current / total) * 100 : 0;
  const estimatedPage = Math.min(
    totalPages,
    Math.max(1, Math.round(current / Math.max(wordsPerPage, 1)))
  );
  const wordsLeft = Math.max(0, total - current);
  const timeRemainingMs = (wordsLeft / speed) * 60000;

  return (
    <div className={cn("w-full space-y-2", light ? "text-[#434655]" : "text-white/70")}>
      <Slider
        min={0}
        max={Math.max(total - 1, 0)}
        value={index}
        onValueChange={onSeek}
        aria-label="Posición de lectura"
        className={light ? "bg-[#dae2fd]" : "bg-white/15"}
      />
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-xs sm:text-sm">
        <span
          className={cn(
            "max-w-[40%] truncate font-medium",
            light ? "text-[#131b2e]" : "text-white/90"
          )}
        >
          {title}
        </span>
        <span>
          Pág. ~{estimatedPage}/{totalPages}
        </span>
        <span>
          Palabra {formatNumber(current)} / {formatNumber(total)}
        </span>
        <span>{percent.toFixed(1)}%</span>
        <span>⏳ {formatDuration(timeRemainingMs)}</span>
      </div>
    </div>
  );
}
