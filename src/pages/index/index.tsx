import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, Dices, Layers, Shuffle, Calculator, ArrowRight } from 'lucide-react-taro'
import type { FC } from 'react'

interface BoardGame {
  id: number
  name: string
  type: string
  min_players: number
  max_players: number
  duration: number
  difficulty: string
  icon_bg: string
  icon_color: string
}

interface GameSession {
  id: number
  game_id: number
  session_name: string
  winner: string
  duration: number
  status: string
  created_at: string
}

const QUICK_TOOLS = [
  { key: 'dice', label: '骰子', icon: <Dices size={22} color="#6366f1" />, bgColor: '#eef2ff', path: '/pages/dice/index' },
  { key: 'timer', label: '计时器', icon: <Clock size={22} color="#10b981" />, bgColor: '#ecfdf5', path: '/pages/timer/index' },
  { key: 'cards', label: '抽牌', icon: <Layers size={22} color="#f59e0b" />, bgColor: '#fffbeb', path: '/pages/cards/index' },
  { key: 'random', label: '选人', icon: <Shuffle size={22} color="#ef4444" />, bgColor: '#fef2f2', path: '/pages/random/index' },
  { key: 'scorer', label: '计分', icon: <Calculator size={22} color="#8b5cf6" />, bgColor: '#f5f3ff', path: '/pages/scorer/index' },
]

const DIFFICULTY_MAP: Record<string, { label: string; color: string }> = {
  easy: { label: '简单', color: '#10b981' },
  medium: { label: '中等', color: '#f59e0b' },
  hard: { label: '困难', color: '#ef4444' },
}

const IndexPage: FC = () => {
  const [hotGames, setHotGames] = useState<BoardGame[]>([])
  const [recentSessions] = useState<GameSession[]>([])

  useEffect(() => {
    fetchHotGames()
  }, [])

  const fetchHotGames = async () => {
    try {
      const res = await Network.request({ url: '/api/games/hot' })
      console.log('[IndexPage] fetchHotGames response:', res.data)
      setHotGames(res.data?.data || [])
    } catch (err) {
      console.error('[IndexPage] fetchHotGames error:', err)
    }
  }

  const goToGame = (id: number) => {
    Taro.navigateTo({ url: `/pages/rule-detail/index?id=${id}` })
  }

  const goToTool = (path: string) => {
    Taro.navigateTo({ url: path })
  }

  return (
    <View className="flex flex-col min-h-screen bg-background">
      {/* Hero 区域 */}
      <View className="px-5 pt-14 pb-6" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
        <Text className="block text-2xl font-bold text-white">桌游助手</Text>
        <Text className="block text-sm text-white text-opacity-70 mt-1">规则速查 · 辅助工具 · 对局记录</Text>
      </View>

      {/* 快捷工具 */}
      <View className="px-4 -mt-4 mb-4">
        <Card>
          <CardContent className="p-3">
            <View className="flex flex-row justify-around">
              {QUICK_TOOLS.map((tool) => (
                <View
                  key={tool.key}
                  className="flex flex-col items-center cursor-pointer"
                  onClick={() => goToTool(tool.path)}
                >
                  <View
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: tool.bgColor }}
                  >
                    {tool.icon}
                  </View>
                  <Text className="block text-xs text-muted-foreground mt-1">{tool.label}</Text>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>
      </View>

      {/* 热门桌游 */}
      <View className="px-4 mb-4">
        <View className="flex flex-row items-center justify-between mb-3">
          <Text className="block text-base font-semibold text-foreground">热门桌游</Text>
          <View
            className="flex flex-row items-center gap-1 cursor-pointer"
            onClick={() => Taro.switchTab({ url: '/pages/games/index' })}
          >
            <Text className="text-xs text-primary">查看全部</Text>
            <ArrowRight size={12} color="#1a1a2e" />
          </View>
        </View>
        <View className="flex flex-row flex-wrap gap-2">
          {hotGames.map((game) => (
            <Card key={game.id} className="cursor-pointer" onClick={() => goToGame(game.id)}>
              <CardContent className="flex flex-row items-center p-3 gap-3">
                <View
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: game.icon_bg || '#e5e7eb' }}
                >
                  <Text className="text-sm font-bold" style={{ color: game.icon_color || '#1f2937' }}>
                    {game.name.charAt(0)}
                  </Text>
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="block text-sm font-semibold text-foreground">{game.name}</Text>
                  <View className="flex flex-row items-center gap-2 mt-1">
                    <Text className="text-xs text-muted-foreground">{game.min_players}-{game.max_players}人</Text>
                    <Text className="text-xs" style={{ color: DIFFICULTY_MAP[game.difficulty]?.color || '#9ca3af' }}>
                      {DIFFICULTY_MAP[game.difficulty]?.label || game.difficulty}
                    </Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          ))}
        </View>
      </View>

      {/* 最近对局 */}
      <View className="px-4 pb-20">
        <View className="flex flex-row items-center justify-between mb-3">
          <Text className="block text-base font-semibold text-foreground">最近对局</Text>
          <View
            className="flex flex-row items-center gap-1 cursor-pointer"
            onClick={() => Taro.switchTab({ url: '/pages/history/index' })}
          >
            <Text className="text-xs text-primary">查看全部</Text>
            <ArrowRight size={12} color="#1a1a2e" />
          </View>
        </View>
        {recentSessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center p-6">
              <Text className="block text-sm text-muted-foreground">还没有对局记录</Text>
              <Button variant="link" size="sm" className="mt-2" onClick={() => Taro.switchTab({ url: '/pages/games/index' })}>
                <Text className="text-primary">开始第一局</Text>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <View className="flex flex-col gap-2">
            {recentSessions.slice(0, 3).map((session) => (
              <Card key={session.id}>
                <CardContent className="p-3">
                  <Text className="block text-sm font-medium text-foreground">{session.session_name}</Text>
                  <Text className="block text-xs text-muted-foreground mt-1">
                    胜者: {session.winner || '-'} | {Math.floor(session.duration / 60)}分钟
                  </Text>
                </CardContent>
              </Card>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}

export default IndexPage
