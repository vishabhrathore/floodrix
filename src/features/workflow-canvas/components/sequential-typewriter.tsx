"use client";

import { useEffect, useState, useRef } from "react";
import MarkdownContent from "@/web/components/MarkdownContent";

interface NodeOutput {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  markdown: string;
}

interface SequentialTypewriterProps {
  executions: NodeOutput[];
  speed?: number; // millisecond delay per character tick
  onAllCompleted?: () => void;
}

export function SequentialTypewriter({
  executions,
  speed = 2,
  onAllCompleted,
}: SequentialTypewriterProps) {
  const [displayedTexts, setDisplayedTexts] = useState<Record<string, string>>({});
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  
  const executionsRef = useRef(executions);
  executionsRef.current = executions;

  const displayedTextsRef = useRef(displayedTexts);
  displayedTextsRef.current = displayedTexts;

  useEffect(() => {
    let isCancelled = false;
    let timer: NodeJS.Timeout | null = null;

    const runTypewriter = async () => {
      for (let i = 0; i < executionsRef.current.length; i++) {
        if (isCancelled) return;
        const exec = executionsRef.current[i];
        const fullText = exec.markdown;
        const currentText = displayedTextsRef.current[exec.nodeId] || "";

        // If this node's text has not been fully typed yet
        if (currentText.length < fullText.length) {
          setActiveNodeId(exec.nodeId);
          
          let typed = currentText;
          // Step character by character
          while (typed.length < fullText.length) {
            if (isCancelled) return;
            typed += fullText.charAt(typed.length);
            
            setDisplayedTexts((prev) => ({
              ...prev,
              [exec.nodeId]: typed,
            }));
            
            await new Promise((resolve) => {
              timer = setTimeout(resolve, speed);
            });
          }
        }
      }
      
      setActiveNodeId(null);
      if (onAllCompleted) {
        onAllCompleted();
      }
    };

    runTypewriter();

    return () => {
      isCancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [executions, speed]);

  return (
    <div className="space-y-6 divide-y divide-neutral-100">
      {executions.map((exec, idx) => {
        const text = displayedTexts[exec.nodeId] ?? "";
        const isActive = activeNodeId === exec.nodeId;
        const isStarted = text.length > 0;

        if (!isStarted) return null;

        return (
          <div key={exec.nodeId} className={idx > 0 ? "pt-6" : ""}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-neutral-800">
                {exec.nodeLabel || "Node Output"}
              </span>
              <span className="text-[9px] font-mono font-bold text-neutral-400 px-1.5 py-0.5 bg-neutral-100 rounded-md">
                {exec.nodeType}
              </span>
            </div>
            <div className="text-xs text-neutral-800 overflow-x-auto relative">
              <MarkdownContent content={text} />
              {isActive && text.length < exec.markdown.length && (
                <span className="inline-block w-[6px] h-[15px] bg-[#fb3640] animate-pulse ml-1 align-middle" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
