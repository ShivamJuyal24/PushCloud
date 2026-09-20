import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-medium transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-r from-brand-500 to-violet-500 text-white shadow-glow hover:from-brand-400 hover:to-violet-400 hover:shadow-glow-lg active:scale-[0.98]',
        ghost: 'bg-transparent text-ink-200 hover:bg-ink-800',
        outline: 'border border-ink-600 bg-transparent text-ink-100 hover:bg-ink-800'
      },
      size: {
        default: 'h-10 px-4 text-sm',
        sm: 'h-8 px-3 text-xs'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default'
    }
  }
);

export const Button = React.forwardRef(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = 'Button';
