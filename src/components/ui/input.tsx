import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full rounded-xl border border-[#e8e8e8] bg-white px-4 py-2 text-sm font-medium ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#a1a1a1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a]/5 focus-visible:border-[#d4d4d4] disabled:cursor-not-allowed disabled:opacity-50 transition-all",
        className
      )}
      {...props}
    />
  )
}

export { Input }
