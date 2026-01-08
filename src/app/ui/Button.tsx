import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<globalThis.HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const Button = forwardRef<globalThis.HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className, children, ...props }, ref) => {
    const classes = [`${variant}-button`, className].filter(Boolean).join(" ");
    return (
      <button className={classes} ref={ref} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
