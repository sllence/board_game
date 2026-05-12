import { View, Text } from '@tarojs/components'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calculator, Plus, Minus, User, RotateCcw } from 'lucide-react-taro'
import type { FC } from 'react'

interface Player {
  name: string
  score: number
}

const ScorerPage: FC = () => {
  const [players, setPlayers] = useState<Player[]>([
    { name: '玩家1', score: 0 },
    { name: '玩家2', score: 0 },
  ])
  const [newPlayerName, setNewPlayerName] = useState('')
  const [step, setStep] = useState(1)

  const addPlayer = () => {
    if (!newPlayerName.trim() || players.length >= 12) return
    setPlayers([...players, { name: newPlayerName.trim(), score: 0 }])
    setNewPlayerName('')
  }

  const changeScore = (idx: number, delta: number) => {
    setPlayers(players.map((p, i) => (i === idx ? { ...p, score: p.score + delta } : p)))
  }

  const resetScores = () => {
    setPlayers(players.map((p) => ({ ...p, score: 0 })))
  }

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

  return (
    <View className="flex flex-col min-h-screen bg-background">
      {/* 标题 */}
      <View className="px-4 pt-12 pb-4">
        <View className="flex flex-row items-center gap-2">
          <Calculator size={22} color="#8b5cf6" />
          <Text className="block text-xl font-bold text-foreground">计分器</Text>
        </View>
      </View>

      {/* 添加玩家 */}
      <View className="px-4 mb-4">
        <View className="flex flex-row gap-2">
          <View className="flex-1">
            <Input
              placeholder="输入玩家名称..."
              value={newPlayerName}
              onInput={(e) => setNewPlayerName(e.detail.value)}
              onConfirm={addPlayer}
            />
          </View>
          <Button size="sm" onClick={addPlayer} disabled={players.length >= 12}>
            <Text className="text-white">添加</Text>
          </Button>
        </View>
      </View>

      {/* 步长设置 */}
      <View className="px-4 mb-4">
        <Text className="block text-sm font-medium text-foreground mb-2">计分步长</Text>
        <View className="flex flex-row flex-wrap gap-2">
          {[1, 2, 3, 5, 10].map((s) => (
            <Badge
              key={s}
              variant={step === s ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => setStep(s)}
            >
              <Text className="text-sm">{s}</Text>
            </Badge>
          ))}
        </View>
      </View>

      {/* 玩家列表 */}
      <View className="flex-1 px-4">
        <View className="flex flex-row items-center justify-between mb-2">
          <Text className="block text-sm text-muted-foreground">排名</Text>
          <View className="cursor-pointer" onClick={resetScores}>
            <View className="flex flex-row items-center gap-1">
              <RotateCcw size={14} color="#9ca3af" />
              <Text className="text-xs text-muted-foreground">重置分数</Text>
            </View>
          </View>
        </View>
        <View className="flex flex-col gap-2">
          {sortedPlayers.map((player, idx) => {
            const originalIdx = players.findIndex((p) => p.name === player.name)
            return (
              <Card key={player.name}>
                <CardContent className="flex flex-row items-center p-3 gap-3">
                  {/* 排名 */}
                  <View className="w-6 flex items-center">
                    <Text className="block text-sm font-bold text-muted-foreground">{idx + 1}</Text>
                  </View>
                  {/* 名称和分数 */}
                  <View className="flex-1 min-w-0">
                    <View className="flex flex-row items-center gap-2">
                      <User size={14} color="#9ca3af" />
                      <Text className="block text-sm font-medium text-foreground truncate">{player.name}</Text>
                    </View>
                    <Text className="block text-2xl font-bold text-primary mt-1">{player.score}</Text>
                  </View>
                  {/* 操作按钮 */}
                  <View className="flex flex-row items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changeScore(originalIdx, -step)}
                    >
                      <Minus size={14} color="#6b7280" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => changeScore(originalIdx, step)}
                    >
                      <Plus size={14} color="#fff" />
                    </Button>
                  </View>
                </CardContent>
              </Card>
            )
          })}
        </View>

        {players.length === 0 && (
          <View className="flex flex-col items-center py-16 opacity-40">
            <Calculator size={64} color="#8b5cf6" />
            <Text className="block text-sm text-muted-foreground mt-4">请先添加玩家</Text>
          </View>
        )}
      </View>

      {/* 底部留白 */}
      <View className="h-8" />
    </View>
  )
}

export default ScorerPage
