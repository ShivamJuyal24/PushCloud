import React from 'react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'flex h-10 w-full rounded border border-ink-600 bg-ink-850/80 px-3 text-sm text-ink-50 placeholder:text-ink-400 outline-none transition-colors font-mono',
      'focus:border-brand-500 focus:ring-1 focus:ring-brand-500/60',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';
