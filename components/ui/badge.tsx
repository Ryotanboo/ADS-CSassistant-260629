import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent py-0.5 font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        // CS アシスタント用: フェーズ・相談種別・優先度
        "phase-free-trial": "bg-muted text-muted-foreground",
        "phase-onboarding":
          "border border-chart-3/30 bg-chart-3/18 text-chart-3 dark:bg-chart-3/25",
        "phase-adoption":
          "border border-chart-1/30 bg-chart-1/18 text-chart-1 dark:bg-chart-1/25",
        "phase-success":
          "border border-chart-2/30 bg-chart-2/18 text-chart-2 dark:bg-chart-2/25",
        "phase-churn-risk":
          "bg-destructive/10 text-destructive dark:bg-destructive/20",
        "consultation-issue": "bg-chart-5/18 text-chart-5 dark:bg-chart-5/25",
        "consultation-action": "bg-chart-4/18 text-chart-4 dark:bg-chart-4/25",
        "priority-high": "bg-destructive/10 text-destructive dark:bg-destructive/20",
        "priority-medium": "bg-chart-3/18 text-chart-3 dark:bg-chart-3/25",
        "priority-low": "bg-muted text-muted-foreground",
      },
      size: {
        default: "h-5 px-2 text-xs",
        xs: "h-4 px-1.5 text-[10px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  size = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, size }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
