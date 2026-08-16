import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-md bg-elevated px-3 text-sm text-foreground shadow-[var(--shadow-border)] placeholder:text-subtle outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-28 w-full rounded-md bg-elevated px-3 py-2.5 text-sm text-foreground shadow-[var(--shadow-border)] placeholder:text-subtle outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
