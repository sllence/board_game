import * as React from "react"
import { View, Text } from "@tarojs/components"
import { cn } from "@/lib/utils"

interface EmptyProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

const Empty = React.forwardRef<React.ElementRef<typeof View>, EmptyProps>(
  ({ icon = "💭", title, description, action, className }, ref) => {
    return (
      <View
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center p-8",
          className
        )}
      >
        <View className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
          <Text className="text-3xl">{icon}</Text>
        </View>
        <Text className="block text-sm font-medium text-gray-900 mb-1">{title}</Text>
        {description && (
          <Text className="block text-xs text-gray-500 text-center mb-3">{description}</Text>
        )}
        {action && <View className="mt-2">{action}</View>}
      </View>
    )
  }
)
Empty.displayName = "Empty"

export { Empty }
