import { View, Text } from '@tarojs/components'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shuffle, Plus, X, User } from 'lucide-react-taro'
import type { FC } from 'react'

const RandomPage: FC = () => {
  const [names, setNames] = useState<string[]>(['玩家1', '玩家2', '玩家3', '玩家4'])
  const [newName, setNewName] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [selecting, setSelecting] = useState(false)

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
    setSelecting(true)
    setResult(null)

    let count = 0
    const interval = setInterval(() => {
      setResult(names[Math.floor(Math.random() * names.length)])
      count++
      if (count >= 12) {
        clearInterval(interval)
        const finalIdx = Math.floor(Math.random() * names.length)
        setResult(names[finalIdx])
        setSelecting(false)
      }
    }, 80)
  }

  return (
    <View className="flex flex-col min-h-screen bg-background">
      {/* 标题 */}
      <View className="px-4 pt-12 pb-4">
        <View className="flex flex-row items-center gap-2">
          <Shuffle size={22} color="#ef4444" />
          <Text className="block text-xl font-bold text-foreground">随机选人</Text>
        </View>
      </View>

      {/* 名单管理 */}
      <View className="px-4 mb-4">
        <Text className="block text-sm font-medium text-foreground mb-2">参与者名单</Text>
        <View className="flex flex-row gap-2 mb-3">
          <View className="flex-1">
            <Input
              placeholder="输入名称..."
              value={newName}
              onInput={(e) => setNewName(e.detail.value)}
              onConfirm={addName}
            />
          </View>
          <Button size="sm" onClick={addName}>
            <View className="flex flex-row items-center gap-1">
              <Plus size={14} color="#fff" />
              <Text className="text-white">添加</Text>
            </View>
          </Button>
        </View>
        <View className="flex flex-row flex-wrap gap-2">
          {names.map((name, idx) => (
            <Badge key={idx} variant="secondary" className="flex flex-row items-center gap-1">
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
      <View className="flex-1 flex flex-col items-center justify-center px-4">
        {result ? (
          <Card className="w-48">
            <CardContent className="flex flex-col items-center p-6">
              <User size={32} color="#ef4444" />
              <Text className="block text-xl font-bold text-foreground mt-3">{result}</Text>
            </CardContent>
          </Card>
        ) : (
          <View className="flex flex-col items-center opacity-40">
            <Shuffle size={64} color="#ef4444" />
            <Text className="block text-sm text-muted-foreground mt-4">点击下方按钮随机选择</Text>
          </View>
        )}
      </View>

      {/* 按钮 */}
      <View className="px-4 pb-8">
        <Button className="w-full h-12" onClick={pickRandom} disabled={names.length < 2 || selecting}>
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
