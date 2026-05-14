"use client";

import React, { useMemo } from 'react';
import * as math from 'mathjs';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { cn } from '@/lib/utils';

interface FormulaDisplayProps {
  expression: string;
  displayMode?: boolean;
  className?: string;
  color?: string;
}

export function FormulaDisplay({ 
  expression, 
  displayMode = false, 
  className,
  color
}: FormulaDisplayProps) {
  const latex = useMemo(() => {
    try {
      const node = math.parse(expression);
      return node.toTex({ parenthesis: 'keep' });
    } catch (err) {
      console.error('MathJS Parse Error:', err);
      return expression; // Fallback to raw expression if parsing fails
    }
  }, [expression]);

  return (
    <div 
      className={cn("formula-display", className)} 
      style={{ color: color || 'inherit' }}
    >
      {displayMode ? (
        <BlockMath math={latex} />
      ) : (
        <InlineMath math={latex} />
      )}
    </div>
  );
}
