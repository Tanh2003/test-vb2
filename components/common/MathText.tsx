'use client';

import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';

interface MathTextProps {
  text: string;
  className?: string;
}

export const MathText: React.FC<MathTextProps> = ({ text, className = '' }) => {
  if (!text) return null;

  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (!part) return null;

        if (part.startsWith('$$') && part.endsWith('$$') && part.length >= 4) {
          const math = part.slice(2, -2).trim();
          return (
            <span key={index} className="block my-2 overflow-x-auto">
              <BlockMath math={math} errorColor="#ef4444" />
            </span>
          );
        }

        if (part.startsWith('$') && part.endsWith('$') && part.length >= 2) {
          const math = part.slice(1, -1).trim();
          return (
            <span key={index} className="inline-block mx-0.5">
              <InlineMath math={math} errorColor="#ef4444" />
            </span>
          );
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
};

export default MathText;
