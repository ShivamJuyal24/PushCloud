import React from 'react';
import { cn } from '../../lib/utils';

export const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('rounded-md border border-ink-700 bg-ink-900', className)}
    {...props}
  />
));
Card.displayName = 'Card';
