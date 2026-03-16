import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-cyber-cyan text-black hover:bg-cyber-cyan/90 shadow-neon-cyan hover:shadow-[0_0_8px_#00f3ff,0_0_30px_rgba(0,243,255,0.6)]',
        destructive:
          'bg-red-600 text-white hover:bg-red-700',
        outline:
          'border border-white/15 bg-transparent text-gray-300 hover:bg-white/5 hover:text-white hover:border-white/30',
        secondary:
          'bg-white/8 text-gray-200 hover:bg-white/12 border border-white/10',
        ghost:
          'text-gray-400 hover:text-white hover:bg-white/5',
        link:
          'text-cyber-cyan underline-offset-4 hover:underline',
        cyber:
          'border border-cyber-cyan/30 bg-cyber-cyan/5 text-cyber-cyan hover:bg-cyber-cyan/15 hover:border-cyber-cyan/60 hover:shadow-neon-cyan',
        'cyber-pink':
          'border border-cyber-pink/30 bg-cyber-pink/5 text-cyber-pink hover:bg-cyber-pink/15 hover:border-cyber-pink/60',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-lg px-6 text-base',
        xl: 'h-12 rounded-xl px-8 text-base',
        icon: 'h-9 w-9',
        'icon-sm': 'h-7 w-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
