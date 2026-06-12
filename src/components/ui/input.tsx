import * as React from "react"
import { Input as TaroInput, View } from "@tarojs/components"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.ComponentPropsWithoutRef<typeof TaroInput> {
  className?: string
  type?: React.ComponentProps<typeof TaroInput>['type']
  autoFocus?: boolean
}

const Input = React.forwardRef<React.ElementRef<typeof TaroInput>, InputProps>(
  ({ className, type, autoFocus, focus, onFocus, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const disabled = !!(props as any).disabled

    React.useEffect(() => {
      if (autoFocus || focus) setIsFocused(true)
    }, [autoFocus, focus])

    return (
      <View
        className={cn(
          "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm shadow-sm ring-offset-background transition-all duration-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-indigo-200 focus-within:ring-offset-2 focus-within:ring-offset-background",
          isFocused &&
            "border-primary ring-2 ring-indigo-200 ring-offset-2 ring-offset-background",
          className
        )}
        onTouchStart={() => {
          if (disabled) return
          setIsFocused(true)
        }}
      >
        <TaroInput
          type={type}
          className="w-full flex-1 bg-transparent text-sm text-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 selection:bg-selection selection:text-selection-foreground"
          placeholderClass="text-muted-foreground"
          ref={ref}
          focus={autoFocus || focus}
          onFocus={(e) => {
            setIsFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setIsFocused(false)
            onBlur?.(e)
          }}
          {...props}
        />
      </View>
    )
  }
)
Input.displayName = "Input"

export { Input }
