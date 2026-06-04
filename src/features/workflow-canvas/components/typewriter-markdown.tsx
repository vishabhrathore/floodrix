"use client";

import { useEffect, useState } from "react";
import MarkdownContent from "@/web/components/MarkdownContent";

interface TypewriterMarkdownProps {
  content: string;
  speed?: number; // millisecond delay per character
}

export function TypewriterMarkdown({ content, speed = 4 }: TypewriterMarkdownProps) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let index = 0;
    setDisplayedText("");

    // Use a small interval to stream the characters
    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + content.charAt(index));
      index++;
      if (index >= content.length) {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [content, speed]);

  return (
    <div className="relative">
      <MarkdownContent content={displayedText} />
      {displayedText.length < content.length && (
        <span className="inline-block w-[6px] h-[15px] bg-[#fb3640] animate-pulse ml-1 align-middle" />
      )}
    </div>
  );
}
