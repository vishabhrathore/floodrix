import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-black/5 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] shadow-lg shadow-black/10",
        destructive:
          "bg-[#e11d48] text-white hover:bg-[#be123c] shadow-lg shadow-red-500/10",
        outline:
          "border border-[#e8e8e8] bg-white text-[#525252] hover:bg-[#fafafa] hover:border-[#d4d4d4] hover:text-[#0a0a0a] shadow-sm",
        secondary:
          "bg-[#f5f5f5] text-[#525252] hover:bg-[#e8e8e8] hover:text-[#0a0a0a]",
        ghost:
          "text-[#a1a1a1] hover:bg-[#f5f5f5] hover:text-[#0a0a0a]",
        link: "text-[#0a0a0a] underline-offset-4 hover:underline",
        premium: "bg-white border border-[#e8e8e8] text-[#0a0a0a] shadow-sm hover:border-[#d4d4d4] hover:bg-[#fafafa]"
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-lg gap-1.5 px-4",
        lg: "h-14 rounded-2xl px-10 text-[12px]",
        icon: "size-10 rounded-xl",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-12 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
