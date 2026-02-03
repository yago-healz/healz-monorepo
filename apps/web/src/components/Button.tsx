import { Slot } from '@radix-ui/react-slot';
import { forwardRef, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
