"use client";

import { useEffect, useState } from "react";
import MarkdownContent from "@/web/components/MarkdownContent";

interface TypewriterMarkdownProps {
  content: string;
  speed?: number; // millisecond delay per tick
  charsPerTick?: number; // number of characters appended per tick
  immediate?: boolean;
}

export function TypewriterMarkdown({
  content,
  speed = 4,
  charsPerTick = 8,
  immediate = false,
}: TypewriterMarkdownProps) {
  const [displayedText, setDisplayedText] = useState(immediate ? content : "");

  useEffect(() => {
    if (immediate) {
      setDisplayedText(content);
      return;
    }

    let index = 0;
    setDisplayedText("");

    // Use a small interval to stream the characters in chunks
    const interval = setInterval(() => {
      if (index >= content.length) {
        clearInterval(interval);
        return;
      }
      const nextIndex = Math.min(index + charsPerTick, content.length);
      const chunk = content.substring(index, nextIndex);
      setDisplayedText((prev) => prev + chunk);
      index = nextIndex;
    }, speed);

    return () => clearInterval(interval);
  }, [content, speed, charsPerTick, immediate]);

  return (
    <div className="relative">
      <MarkdownContent content={displayedText} />
      {displayedText.length < content.length && (
        <span className="inline-block w-[6px] h-[15px] bg-[#fb3640] animate-pulse ml-1 align-middle" />
      )}
    </div>
  );
}
