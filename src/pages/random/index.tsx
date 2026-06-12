import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Shuffle, Plus, X, User, ArrowLeft } from 'lucide-react-taro'
import type { FC } from 'react'

const RandomPage: FC = () => {
  const [names, setNames] = useState<string[]>(['玩家1', '玩家2', '玩家3', '玩家4'])
  const [newName, setNewName] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [selecting, setSelecting] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const addName = () => {
    if (!newName.trim()) return
    setNames([...names, newName.trim()])
    setNewName('')
  }

  const removeName = (idx: number) => {
    setNames(names.filter((_, i) => i !== idx))
    setResult(null)
  }

  const pickRandom = () => {
    if (names.length === 0) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    setSelecting(true)
    setResult(null)

    let count = 0
    intervalRef.current = setInterval(() => {
      count++
      if (count >= 12) {
        clearInterval(intervalRef.current!)
        intervalRef.current = null
        const finalIdx = Math.floor(Math.random() * names.length)
        setResult(names[finalIdx])
        setSelecting(false)
      } else {
        setResult(names[Math.floor(Math.random() * names.length)])
      }
    }, 80)
  }

  return (
    <View className="flex flex-col min-h-screen bg-background">
      {/* 标题 */}
      <View className="px-5 pt-12 pb-4 bg-white">
        <View className="flex flex-row items-center justify-between">
          <View className="flex flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
              <Shuffle size={18} color="#fff" />
            </View>
            <Text className="block text-xl font-bold text-foreground">随机选人</Text>
          </View>
          {Taro.getCurrentPages().length > 1 && (
            <View className="flex flex-row items-center gap-1 cursor-pointer" onClick={() => Taro.navigateBack()}>
              <ArrowLeft size={14} color="#ef4444" />
              <Text className="text-sm text-red-500">返回</Text>
            </View>
          )}
        </View>
      </View>

      {/* 名单管理 */}
      <View className="px-5 mt-4 mb-4 bg-white mx-4 rounded-2xl p-4">
        <Text className="block text-sm font-medium text-[#374151] mb-3">参与者名单</Text>
        <View className="flex flex-row gap-2 mb-3">
          <Input
            className="flex-1"
            placeholder="输入名称..."
            value={newName}
            onInput={(e) => setNewName(e.detail.value)}
            onConfirm={addName}
          />
          <Button size="sm" onClick={addName} className="rounded-xl h-11">
            <View className="flex flex-row items-center gap-1">
              <Plus size={14} color="#fff" />
              <Text className="text-white">添加</Text>
            </View>
          </Button>
        </View>
        <View className="flex flex-row flex-wrap gap-2">
          {names.map((name, idx) => (
            <Badge key={idx} variant="secondary" className="flex flex-row items-center gap-1 rounded-lg px-3 py-1">
              <User size={12} color="#9ca3af" />
              <Text className="text-sm">{name}</Text>
              <View className="cursor-pointer" onClick={() => removeName(idx)}>
                <X size={12} color="#9ca3af" />
              </View>
            </Badge>
          ))}
        </View>
      </View>

      {/* 结果展示 */}
      <View className="flex-1 flex flex-col items-center justify-center px-5">
        {result ? (
          <View
            className="w-48 rounded-2xl bg-white flex flex-col items-center py-8"
            style={{ boxShadow: selecting ? '0 0 0 3px rgba(79,70,229,0.2)' : '0 4px 20px rgba(0,0,0,0.06)' }}
          >
            <View className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
              <User size={24} color="#fff" />
            </View>
            <Text className="block text-xl font-bold text-foreground">{result}</Text>
          </View>
        ) : (
          <View className="flex flex-col items-center opacity-30">
            <Shuffle size={64} color="#ef4444" />
            <Text className="block text-sm text-gray-400 mt-4">点击下方按钮随机选择</Text>
          </View>
        )}
      </View>

      {/* 按钮 */}
      <View className="px-5 pb-8">
        <Button
          className="w-full h-12 rounded-2xl"
          onClick={pickRandom}
          disabled={names.length < 2 || selecting}
          style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
        >
          <View className="flex flex-row items-center gap-2">
            <Shuffle size={18} color="#fff" />
            <Text className="text-white font-semibold">
              {selecting ? '选择中...' : '随机选择'}
            </Text>
          </View>
        </Button>
      </View>
    </View>
  )
}

export default RandomPage
