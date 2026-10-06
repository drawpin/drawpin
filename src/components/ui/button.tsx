import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

/**
 * DrawPin's buttons (UI pass, restyled 2026-10-05 to match the home page).
 * The main one is the inked yellow button: an ink outline and a hard shadow
 * that it lifts off under a mouse and sinks into when pressed. Outline
 * buttons share the ink outline. Every size is at least 44px tall, the
 * smallest target a thumb hits reliably; `sm` is narrower and
 * smaller-texted, not shorter. There is no dark mode.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-transparent bg-clip-padding font-bold whitespace-nowrap transition-[background-color,border-color,color,transform,translate,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] outline-none select-none focus-visible:ring-3 focus-visible:ring-highlight active:not-aria-[haspopup]:scale-[0.97] active:duration-100 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 motion-reduce:transition-none motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          "border-foreground bg-winner text-foreground font-extrabold shadow-[4px_4px_0_var(--foreground)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--foreground)] active:translate-x-1 active:translate-y-1 active:shadow-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0",
        outline:
          "border-foreground bg-white text-foreground hover:bg-secondary aria-expanded:bg-secondary",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--primary)_8%)] aria-expanded:bg-secondary",
        ghost: "text-foreground hover:bg-accent aria-expanded:bg-accent",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 gap-2 px-5 text-[15px]",
        sm: "h-11 gap-1.5 px-3.5 text-sm",
        lg: "h-12 gap-2 px-6 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
