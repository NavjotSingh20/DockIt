import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold font-display transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-accent text-white",
        secondary:
          "border-transparent bg-base-dark text-ink-muted",
        destructive:
          "border-transparent bg-danger text-white",
        outline:
          "text-ink border-rule",
        success:
          "border-transparent bg-settled text-white",
        warning:
          "border-transparent bg-caution text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
