import { View, Text } from '@tarojs/components'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Timer, Play, Pause, RotateCcw } from 'lucide-react-taro'
import type { FC } from 'react'

const PRESETS = [
  { label: '1分钟', seconds: 60 },
  { label: '3分钟', seconds: 180 },
  { label: '5分钟', seconds: 300 },
  { label: '10分钟', seconds: 600 },
  { label: '15分钟', seconds: 900 },
  { label: '30分钟', seconds: 1800 },
]

type TimerMode = 'countdown' | 'stopwatch'

const TimerPage: FC = () => {
  const [mode, setMode] = useState<TimerMode>('countdown')
  const [totalSeconds, setTotalSeconds] = useState(60)
  const [remaining, setRemaining] = useState(60)
  const [running, setRunning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => clearTimer()
  }, [clearTimer])

  const tick = useCallback(() => {
    setRemaining((prev) => {
      if (mode === 'countdown') {
        if (prev <= 1) {
          clearTimer()
          setRunning(false)
          return 0
        }
        return prev - 1
      }
      return prev + 1
    })
  }, [mode, clearTimer])

  const start = () => {
    if (running) return
    setRunning(true)
    timerRef.current = setInterval(tick, 1000)
  }

  const pause = () => {
    clearTimer()
    setRunning(false)
  }

  const reset = () => {
    clearTimer()
    setRunning(false)
    if (mode === 'countdown') {
      setRemaining(totalSeconds)
    } else {
      setRemaining(0)
    }
  }

  const selectPreset = (seconds: number) => {
    clearTimer()
    setRunning(false)
    setTotalSeconds(seconds)
    setRemaining(seconds)
  }

  const switchMode = (newMode: TimerMode) => {
    clearTimer()
    setRunning(false)
    setMode(newMode)
    if (newMode === 'stopwatch') {
      setRemaining(0)
    } else {
      setRemaining(totalSeconds)
    }
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const progress = mode === 'countdown' && totalSeconds > 0
    ? ((totalSeconds - remaining) / totalSeconds) * 100
    : 0

  return (
    <View className="flex flex-col min-h-screen bg-background">
      {/* 标题 */}
      <View className="px-4 pt-12 pb-4">
        <View className="flex flex-row items-center gap-2">
          <Timer size={22} color="#10b981" />
          <Text className="block text-xl font-bold text-foreground">计时器</Text>
        </View>
      </View>

      {/* 模式切换 */}
      <View className="px-4 mb-4">
        <View className="flex flex-row gap-2">
          <Badge
            variant={mode === 'countdown' ? 'default' : 'secondary'}
            className="cursor-pointer"
            onClick={() => switchMode('countdown')}
          >
            <Text className="text-sm">倒计时</Text>
          </Badge>
          <Badge
            variant={mode === 'stopwatch' ? 'default' : 'secondary'}
            className="cursor-pointer"
            onClick={() => switchMode('stopwatch')}
          >
            <Text className="text-sm">正计时</Text>
          </Badge>
        </View>
      </View>

      {/* 预设选择（仅倒计时模式） */}
      {mode === 'countdown' && (
        <View className="px-4 mb-6">
          <Text className="block text-sm font-medium text-foreground mb-2">快速设置</Text>
          <View className="flex flex-row flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Badge
                key={preset.seconds}
                variant={totalSeconds === preset.seconds ? 'default' : 'secondary'}
                className="cursor-pointer"
                onClick={() => selectPreset(preset.seconds)}
              >
                <Text className="text-sm">{preset.label}</Text>
              </Badge>
            ))}
          </View>
        </View>
      )}

      {/* 时间显示 */}
      <View className="flex-1 flex flex-col items-center justify-center px-4">
        <View className="relative w-52 h-52 flex items-center justify-center">
          {/* 进度环背景 */}
          <View className="absolute inset-0 rounded-full border-8 border-muted" />
          {/* 进度环前景（简化版用边框色表示） */}
          {mode === 'countdown' && running && (
            <View
              className="absolute inset-0 rounded-full border-8 border-primary"
              style={{ clipPath: `inset(0 0 ${100 - progress}% 0)` }}
            />
          )}
          {mode === 'countdown' && !running && remaining === 0 && totalSeconds > 0 && (
            <View className="absolute inset-0 rounded-full border-8 border-red-500" />
          )}
          <View className="flex flex-col items-center">
            <Text className="block text-5xl font-mono font-bold text-foreground">
              {formatTime(remaining)}
            </Text>
            {mode === 'countdown' && remaining === 0 && totalSeconds > 0 && (
              <Text className="block text-sm text-red-500 font-medium mt-2">时间到！</Text>
            )}
          </View>
        </View>
      </View>

      {/* 控制按钮 */}
      <View className="px-4 pb-8 flex flex-row gap-3 justify-center">
        <Button variant="outline" size="lg" onClick={reset}>
          <View className="flex flex-row items-center gap-2">
            <RotateCcw size={18} color="#6b7280" />
            <Text>重置</Text>
          </View>
        </Button>
        {!running ? (
          <Button size="lg" onClick={start}>
            <View className="flex flex-row items-center gap-2">
              <Play size={18} color="#fff" />
              <Text className="text-white">开始</Text>
            </View>
          </Button>
        ) : (
          <Button size="lg" variant="secondary" onClick={pause}>
            <View className="flex flex-row items-center gap-2">
              <Pause size={18} color="#1a1a2e" />
              <Text>暂停</Text>
            </View>
          </Button>
        )}
      </View>
    </View>
  )
}

export default TimerPage
