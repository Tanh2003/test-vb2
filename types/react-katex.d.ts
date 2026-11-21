declare module 'react-katex' {
  import * as React from 'react';

  export interface KatexProps {
    math?: string;
    children?: React.ReactNode;
    errorColor?: string;
    renderError?: (error: Error | TypeError) => React.ReactNode;
  }

  export const InlineMath: React.FC<KatexProps>;
  export const BlockMath: React.FC<KatexProps>;
}
