"use client";

import * as React from "react";
import { splitAtOrp } from "@/lib/orp";
import type { ReaderSettings } from "@/types";

interface WordDisplayProps {
  chunkText: string;
  pivotWord: string;
  settings: ReaderSettings;
}

/**
 * Renders the current chunk. When ORP is on, the pivot letter of the first
 * word is highlighted and pinned to the exact horizontal centre so the eye
 * never has to move — the defining trick of RSVP readers.
 */
export const WordDisplay = React.memo(function WordDisplay({
  chunkText,
  pivotWord,
  settings,
}: WordDisplayProps) {
  const style: React.CSSProperties = {
    fontFamily: settings.fontFamily,
    fontSize: settings.fontSize,
    color: settings.textColor,
    letterSpacing: `${settings.letterSpacing}em`,
    lineHeight: 1.1,
    fontWeight: 600,
  };

  if (!settings.orpEnabled) {
    return (
      <div className="text-center" style={style}>
        {chunkText}
      </div>
    );
  }

  const { before, pivot, after } = splitAtOrp(pivotWord);
  // Any additional words in the chunk trail after the pivot word.
  const rest = chunkText.slice(pivotWord.length);

  return (
    <div className="flex w-full items-baseline justify-center" style={style}>
      {/* Left half: everything before the pivot, right-aligned to centre. */}
      <span className="flex-1 whitespace-pre text-right">{before}</span>
      {/* The pivot letter sits exactly on the vertical guide line. */}
      <span style={{ color: settings.orpColor }} className="whitespace-pre">
        {pivot}
      </span>
      {/* Right half: pivot's tail plus any following words in the chunk. */}
      <span className="flex-1 whitespace-pre text-left">
        {after}
        {rest}
      </span>
    </div>
  );
});
