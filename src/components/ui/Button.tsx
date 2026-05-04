import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-lphie-gold text-lphie-ink hover:bg-lphie-gold/90 focus-visible:ring-lphie-gold/50",
  secondary:
    "bg-white text-lphie-ink border border-lphie-ink/10 hover:bg-lphie-cream focus-visible:ring-lphie-ink/20",
  ghost:
    "bg-transparent text-lphie-ink hover:bg-lphie-ink/5 focus-visible:ring-lphie-ink/20",
  danger:
    "bg-lphie-accent text-white hover:bg-lphie-accent/90 focus-visible:ring-lphie-accent/40",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", isLoading, className = "", children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold tracking-tight",
        "transition-colors focus-visible:outline-none focus-visible:ring-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
      {...rest}
    >
      {isLoading ? <span className="animate-pulse">…</span> : children}
    </button>
  );
});
