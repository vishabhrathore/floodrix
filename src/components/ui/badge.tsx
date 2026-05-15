import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-lg border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 transition-all active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#0a0a0a] text-white",
        secondary:
          "border-[#e8e8e8] bg-[#f5f5f5] text-[#525252]",
        destructive:
          "border-[#fecdd3] bg-[#fff1f2] text-[#e11d48]",
        outline:
          "border-[#e8e8e8] text-[#a1a1a1]",
        success:
          "border-[#dcfce7] bg-[#f0fdf4] text-[#00b341]",
        info:
          "border-[#dbeafe] bg-[#f0f7ff] text-[#0070f3]"
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
