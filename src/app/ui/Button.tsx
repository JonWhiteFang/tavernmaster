import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<globalThis.HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

export default function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = [`${variant}-button`, className].filter(Boolean).join(" ");
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
