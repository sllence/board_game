import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Timer, Play, Pause, RotateCcw, ArrowLeft } from 'lucide-react-taro'
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
  const modeRef = useRef(mode)
  const runningRef = useRef(running)

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { runningRef.current = running }, [running])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => clearTimer()
  }, [clearTimer])

  const start = () => {
    if (running) return
    setRunning(true)
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (modeRef.current === 'countdown') {
          if (prev <= 1) {
            clearTimer()
            setRunning(false)
            // 倒计时结束震动提醒
            try { Taro.vibrateShort({ type: 'heavy' }) } catch { /* 部分环境不支持 */ }
            return 0
          }
          return prev - 1
        }
        return prev + 1
      })
    }, 1000)
  }

  const pause = () => {
    clearTimer()
    setRunning(false)
  }

  const reset = () => {
    clearTimer()
    setRunning(false)
    setRemaining(mode === 'countdown' ? totalSeconds : 0)
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
    setRemaining(newMode === 'stopwatch' ? 0 : totalSeconds)
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const progress = mode === 'countdown' && totalSeconds > 0
    ? ((totalSeconds - remaining) / totalSeconds) * 100
    : 0

  const isFinished = mode === 'countdown' && remaining === 0 && totalSeconds > 0

  return (
    <View className="flex flex-col min-h-screen bg-background">
      {/* 标题 */}
      <View className="px-5 pt-12 pb-4 bg-white">
        <View className="flex flex-row items-center justify-between">
          <View className="flex flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <Timer size={18} color="#fff" />
            </View>
            <Text className="block text-xl font-bold text-foreground">计时器</Text>
          </View>
          {Taro.getCurrentPages().length > 1 && (
            <View className="flex flex-row items-center gap-1 cursor-pointer" onClick={() => Taro.navigateBack()}>
              <ArrowLeft size={14} color="#10b981" />
              <Text className="text-sm text-emerald-500">返回</Text>
            </View>
          )}
        </View>
      </View>

      {/* 模式切换 */}
      <View className="px-5 mt-4 mb-4">
        <View className="flex flex-row gap-2">
          <Badge
            variant={mode === 'countdown' ? 'default' : 'secondary'}
            className="cursor-pointer rounded-lg px-4 py-2"
            onClick={() => switchMode('countdown')}
          >
            <Text className="text-sm font-medium">倒计时</Text>
          </Badge>
          <Badge
            variant={mode === 'stopwatch' ? 'default' : 'secondary'}
            className="cursor-pointer rounded-lg px-4 py-2"
            onClick={() => switchMode('stopwatch')}
          >
            <Text className="text-sm font-medium">正计时</Text>
          </Badge>
        </View>
      </View>

      {/* 预设选择（仅倒计时模式） */}
      {mode === 'countdown' && (
        <View className="px-5 mb-5">
          <Text className="block text-sm font-medium text-[#374151] mb-3">快速设置</Text>
          <View className="flex flex-row flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Badge
                key={preset.seconds}
                variant={totalSeconds === preset.seconds ? 'default' : 'secondary'}
                className="cursor-pointer rounded-lg px-4 py-2"
                onClick={() => selectPreset(preset.seconds)}
              >
                <Text className="text-sm font-medium">{preset.label}</Text>
              </Badge>
            ))}
          </View>
        </View>
      )}

      {/* 时间显示 */}
      <View className="flex-1 flex flex-col items-center justify-center px-5">
        <View
          className="relative w-52 h-52 rounded-full flex items-center justify-center bg-white"
          style={{ boxShadow: isFinished ? '0 0 0 4px #f87171' : '0 4px 20px rgba(0,0,0,0.06)' }}
        >
          {/* 倒计时进度填充 */}
          {mode === 'countdown' && running && progress > 0 && (
            <View
              className="absolute bottom-0 left-0 right-0 rounded-b-full"
              style={{ height: `${progress}%`, background: 'linear-gradient(180deg, transparent, rgba(79,70,229,0.08))' }}
            />
          )}
          <View className="flex flex-col items-center relative">
            <Text
              className="block text-5xl font-mono font-bold"
              style={{ color: isFinished ? '#ef4444' : '#1e1b4b' }}
            >
              {formatTime(remaining)}
            </Text>
            {isFinished && (
              <Text className="block text-sm text-red-500 font-medium mt-2">时间到！</Text>
            )}
          </View>
        </View>
      </View>

      {/* 控制按钮 */}
      <View className="px-5 pb-8 flex flex-row gap-3 justify-center">
        <Button
          variant="outline"
          size="lg"
          onClick={reset}
          className="rounded-2xl w-24"
        >
          <View className="flex flex-row items-center gap-2">
            <RotateCcw size={16} color="#6b7280" />
            <Text className="text-gray-500">重置</Text>
          </View>
        </Button>
        {running ? (
          <Button
            size="lg"
            onClick={pause}
            className="rounded-2xl flex-1 max-w-48"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
          >
            <View className="flex flex-row items-center gap-2">
              <Pause size={18} color="#fff" />
              <Text className="text-white font-semibold">暂停</Text>
            </View>
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={start}
            disabled={isFinished}
            className="rounded-2xl flex-1 max-w-48"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
          >
            <View className="flex flex-row items-center gap-2">
              <Play size={18} color="#fff" />
              <Text className="text-white font-semibold">开始</Text>
            </View>
          </Button>
        )}
      </View>
    </View>
  )
}

export default TimerPage
