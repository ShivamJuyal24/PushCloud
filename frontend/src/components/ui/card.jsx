import React from 'react';
import { cn } from '../../lib/utils';

export const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-lg border border-white/[0.06] bg-ink-900/70 shadow-card backdrop-blur-sm',
      className
    )}
    {...props}
  />
));
Card.displayName = 'Card';
