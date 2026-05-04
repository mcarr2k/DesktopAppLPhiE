import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md" | "lg";
};

const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };

export function Modal({ open, onClose, title, children, footer, width = "md" }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-lphie-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={[
          "relative z-10 w-full rounded-2xl bg-white shadow-2xl animate-fade-in",
          widths[width],
        ].join(" ")}
      >
        {title && (
          <header className="flex items-center justify-between border-b border-lphie-ink/10 px-5 py-4">
            <h2 className="font-display text-xl font-semibold text-lphie-ink">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-lphie-ink/60 hover:bg-lphie-ink/5"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </header>
        )}
        <div className="px-5 py-5">{children}</div>
        {footer && (
          <footer className="border-t border-lphie-ink/10 px-5 py-4">{footer}</footer>
        )}
      </div>
    </div>
  );
}
