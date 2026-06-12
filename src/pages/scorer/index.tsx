import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Calculator, Plus, Minus, User, RotateCcw, X, ArrowLeft } from 'lucide-react-taro'
import type { FC } from 'react'

interface Player {
  name: string
  score: number
}

const RANK_STYLES = [
  { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#fff' },
  { bg: 'linear-gradient(135deg, #9ca3af, #6b7280)', color: '#fff' },
  { bg: 'linear-gradient(135deg, #d97706, #b45309)', color: '#fff' },
]

const ScorerPage: FC = () => {
  const [players, setPlayers] = useState<Player[]>([
    { name: '玩家1', score: 0 },
    { name: '玩家2', score: 0 },
  ])
  const [newPlayerName, setNewPlayerName] = useState('')
  const [step, setStep] = useState(1)
  const [linkedSessionId, setLinkedSessionId] = useState<number | null>(null)

  useEffect(() => {
    try {
      const raw = Taro.getStorageSync('scorer_session')
      if (raw) {
        const data = JSON.parse(raw)
        setLinkedSessionId(data.sessionId)
        setPlayers(data.players.map((p: { name: string; score: number }) => ({ name: p.name, score: p.score })))
      }
    } catch { /* ignore */ }
  }, [])

  const addPlayer = () => {
    if (!newPlayerName.trim() || players.length >= 12) return
    setPlayers([...players, { name: newPlayerName.trim(), score: 0 }])
    setNewPlayerName('')
  }

  const changeScore = (idx: number, delta: number) => {
    setPlayers(players.map((p, i) => (i === idx ? { ...p, score: p.score + delta } : p)))
  }

  const removePlayer = (idx: number) => {
    setPlayers(players.filter((_, i) => i !== idx))
  }

  const resetScores = () => {
    setPlayers(players.map((p) => ({ ...p, score: 0 })))
  }

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

  return (
    <View className="flex flex-col min-h-screen bg-background">
      {/* 标题 */}
      <View className="px-5 pt-12 pb-4 bg-white">
        <View className="flex flex-row items-center justify-between">
          <View className="flex flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
              <Calculator size={18} color="#fff" />
            </View>
            <Text className="block text-xl font-bold text-foreground">计分器</Text>
          </View>
          {Taro.getCurrentPages().length > 1 && (
            <View
              className="flex flex-row items-center gap-1 cursor-pointer"
              onClick={() => {
                if (linkedSessionId !== null) {
                  Taro.setStorageSync('scorer_session', JSON.stringify({
                    sessionId: linkedSessionId,
                    players: players.map((p) => ({ name: p.name, score: p.score })),
                  }))
                }
                Taro.navigateBack()
              }}
            >
              <ArrowLeft size={14} color="#8b5cf6" />
              <Text className="text-sm text-purple-500">返回对局</Text>
              {linkedSessionId !== null && (
                <View className="ml-1 w-2 h-2 rounded-full bg-green-400" />
              )}
            </View>
          )}
        </View>
      </View>

      {/* 添加玩家 */}
      <View className="px-5 mt-4 bg-white mx-4 rounded-2xl p-4">
        <Text className="block text-sm font-medium text-[#374151] mb-3">添加玩家</Text>
        <View className="flex flex-row gap-2">
          <Input
            className="flex-1"
            placeholder="输入玩家名称..."
            value={newPlayerName}
            onInput={(e) => setNewPlayerName(e.detail.value)}
            onConfirm={addPlayer}
          />
          <Button size="sm" onClick={addPlayer} disabled={players.length >= 12} className="rounded-xl h-11">
            <View className="flex flex-row items-center gap-1">
              <Plus size={14} color="#fff" />
              <Text className="text-white">添加</Text>
            </View>
          </Button>
        </View>
      </View>

      {/* 步长设置 */}
      <View className="px-5 mt-4 bg-white mx-4 rounded-2xl p-4">
        <Text className="block text-sm font-medium text-[#374151] mb-3">计分步长</Text>
        <View className="flex flex-row flex-wrap gap-2">
          {[1, 2, 3, 5, 10].map((s) => (
            <Badge
              key={s}
              variant={step === s ? 'default' : 'secondary'}
              className="cursor-pointer rounded-lg px-3 py-1"
              onClick={() => setStep(s)}
            >
              <Text className="text-sm">{s}</Text>
            </Badge>
          ))}
        </View>
      </View>

      {/* 排名标题 */}
      <View className="px-5 mt-4 flex flex-row items-center justify-between">
        <Text className="block text-sm font-medium text-[#374151]">排行榜</Text>
        <View className="cursor-pointer" onClick={resetScores}>
          <View className="flex flex-row items-center gap-1">
            <RotateCcw size={14} color="#9ca3af" />
            <Text className="text-xs text-gray-400">重置</Text>
          </View>
        </View>
      </View>

      {/* 玩家列表 */}
      <View className="flex-1 px-4 mt-2">
        <View className="flex flex-col gap-3">
          {sortedPlayers.map((player, idx) => {
            const originalIdx = players.findIndex((p) => p.name === player.name)
            const rankStyle = idx < 3 ? RANK_STYLES[idx] : null
            return (
              <View key={player.name} className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <View className="flex flex-row items-center gap-3">
                  {/* 排名 */}
                  {rankStyle ? (
                    <View className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: rankStyle.bg }}>
                      <Text className="block text-sm font-bold" style={{ color: rankStyle.color }}>{idx + 1}</Text>
                    </View>
                  ) : (
                    <View className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100">
                      <Text className="block text-sm font-bold text-gray-400">{idx + 1}</Text>
                    </View>
                  )}
                  {/* 名称和分数 */}
                  <View className="flex-1 min-w-0">
                    <View className="flex flex-row items-center gap-2">
                      <User size={14} color="#9ca3af" />
                      <Text className="block text-sm font-medium text-foreground truncate">{player.name}</Text>
                    </View>
                    <Text className="block text-2xl font-bold text-indigo-600 mt-1">{player.score}</Text>
                  </View>
                  {/* 操作按钮 */}
                  <View className="flex flex-row items-center gap-2">
                    <View
                      className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 cursor-pointer"
                      onClick={() => changeScore(originalIdx, -step)}
                    >
                      <Minus size={16} color="#6b7280" />
                    </View>
                    <View
                      className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer"
                      style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
                      onClick={() => changeScore(originalIdx, step)}
                    >
                      <Plus size={16} color="#fff" />
                    </View>
                    <View
                      className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50 cursor-pointer"
                      onClick={() => removePlayer(originalIdx)}
                    >
                      <X size={14} color="#ef4444" />
                    </View>
                  </View>
                </View>
              </View>
            )
          })}
        </View>

        {players.length === 0 && (
          <View className="flex flex-col items-center py-16 opacity-30">
            <Calculator size={64} color="#8b5cf6" />
            <Text className="block text-sm text-gray-400 mt-4">请先添加玩家</Text>
          </View>
        )}
      </View>

      {/* 底部留白 */}
      <View className="h-8" />
    </View>
  )
}

export default ScorerPage
