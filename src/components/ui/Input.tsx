import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = "", id, ...rest },
  ref
) {
  const inputId = id ?? rest.name;
  return (
    <label className="block" htmlFor={inputId}>
      {label && (
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-lphie-ink/70">
          {label}
        </span>
      )}
      <input
        ref={ref}
        id={inputId}
        className={[
          "h-10 w-full rounded-lg border bg-white px-3 text-sm",
          "border-lphie-ink/15 focus:border-lphie-gold focus:outline-none focus:ring-2 focus:ring-lphie-gold/30",
          error && "border-lphie-accent focus:ring-lphie-accent/30",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      />
      {error && <span className="mt-1 block text-xs text-lphie-accent">{error}</span>}
    </label>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className = "", id, ...rest },
  ref
) {
  const inputId = id ?? rest.name;
  return (
    <label className="block" htmlFor={inputId}>
      {label && (
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-lphie-ink/70">
          {label}
        </span>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={[
          "min-h-[88px] w-full rounded-lg border bg-white p-3 text-sm",
          "border-lphie-ink/15 focus:border-lphie-gold focus:outline-none focus:ring-2 focus:ring-lphie-gold/30",
          error && "border-lphie-accent focus:ring-lphie-accent/30",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      />
      {error && <span className="mt-1 block text-xs text-lphie-accent">{error}</span>}
    </label>
  );
});
