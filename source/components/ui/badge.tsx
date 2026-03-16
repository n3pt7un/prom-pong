import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
  {
    variants: {
      variant: {
        default: 'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30',
        secondary: 'bg-white/8 text-gray-300 border border-white/10',
        destructive: 'bg-red-600/20 text-red-400 border border-red-500/30',
        outline: 'border border-white/20 text-gray-300',
        cyan: 'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30',
        pink: 'bg-cyber-pink/15 text-cyber-pink border border-cyber-pink/30',
        purple: 'bg-cyber-purple/15 text-cyber-purple border border-cyber-purple/30',
        yellow: 'bg-cyber-yellow/15 text-cyber-yellow border border-cyber-yellow/30',
        success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
        warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
