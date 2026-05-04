import type { HTMLAttributes, ReactNode } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className = "", ...rest }: Props) {
  return (
    <div
      className={[
        "rounded-2xl bg-white shadow-widget border border-lphie-ink/5 overflow-hidden",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
