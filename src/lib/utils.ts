import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 将对局时长（秒）格式化为 "x天x小时x分钟" 形式
 * 零值字段自动省略，所有字段为0时返回 "0分钟"
 * 示例：1800 → "30分钟", 7200 → "2小时0分钟", 90000 → "1天1小时0分钟"
 */
export function formatGameDuration(seconds: number): string {
  if (!seconds && seconds !== 0) return '-'
  const totalMinutes = Math.floor(seconds / 60)
  if (totalMinutes <= 0) return '0分钟'

  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const mins = totalMinutes % 60

  const parts: string[] = []
  if (days > 0) parts.push(`${days}天`)
  if (hours > 0) parts.push(`${hours}小时`)
  parts.push(`${mins}分钟`)

  return parts.join('')
}
