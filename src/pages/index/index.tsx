import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Empty } from '@/components/ui/empty'
import { Dices, Calculator, ArrowRight, Sparkles, Play, History, Hand, Timer } from 'lucide-react-taro'
import { WheelIcon } from '@/components/wheel-icon'
import { requireLogin, getCurrentUser } from '@/utils/auth'
import { TYPE_META, SCENE_META, DIFFICULTY_META, ICON_KEY_MAP } from '@/constants/game'
import type { FC } from 'react'

interface BoardGame {
  id: number
  name: string
  type: string[]
  min_players: number
  max_players: number
  min_duration: number
  max_duration: number
  difficulty: string
  icon_key: string
  icon_bg: string
  icon_color: string
  image_url?: string
  scene?: string[]
  status: string
}

interface GameSession {
  id: number
  game_id: number | null
  session_name: string
  winner: string | null
  duration: number | null
  status: string
  created_at: string
  game?: { name: string } | null
}

const QUICK_TOOLS = [
  { key: 'finger', label: '手指选人', icon: <Hand size={24} color="#fff" />, gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', path: '/pages/finger-picker/index' },
  { key: 'dice', label: '骰子', icon: <Dices size={24} color="#fff" />, gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', path: '/pages/dice/index' },
  { key: 'wheel', label: '转盘', icon: <WheelIcon size={24} color="#fff" />, gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', path: '/pages/wheel-manage/index' },
  { key: 'timer', label: '计时器', icon: <Timer size={24} color="#fff" />, gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', path: '/pages/timer/index' },
  { key: 'scorer', label: '计分', icon: <Calculator size={24} color="#fff" />, gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', path: '/pages/scorer/index' },
]

const IndexPage: FC = () => {
  const [hotGames, setHotGames] = useState<BoardGame[]>([])
  const [recentSessions, setRecentSessions] = useState<GameSession[]>([])
  const [activeSession, setActiveSession] = useState<GameSession | null>(null)
  const [loading, setLoading] = useState(false)

  useDidShow(() => {
    fetchHotGames()
    fetchRecentSessions()
  })

  const fetchHotGames = async () => {
    try {
      const res = await Network.request({ url: '/api/games/hot' })
      console.log('[IndexPage] fetchHotGames response:', res.data)
      setHotGames(res.data?.data || [])
    } catch (err) {
      console.error('[IndexPage] fetchHotGames error:', err)
    }
  }

  const fetchRecentSessions = async () => {
    const currentUser = getCurrentUser()
    if (!currentUser?.id) {
      setRecentSessions([])
      setActiveSession(null)
      return
    }

    setLoading(true)
    try {
      const res = await Network.request({ 
        url: `/api/sessions/recent?user_id=${currentUser.id}` 
      })
      console.log('[IndexPage] fetchRecentSessions response:', res.data)
      const sessions = res.data?.data || []
      setRecentSessions(sessions)
      
      // 找到第一个进行中的对局
      const active = sessions.find((s: GameSession) => s.status === 'playing')
      setActiveSession(active || null)
    } catch (err) {
      console.error('[IndexPage] fetchRecentSessions error:', err)
    } finally {
      setLoading(false)
    }
  }

  const goToGame = (id: number) => {
    Taro.navigateTo({ url: `/pages/rule-detail/index?id=${id}` })
  }

  const goToTool = (path: string) => {
    Taro.navigateTo({ url: path })
  }

  const goToSession = (sessionId: number) => {
    requireLogin(() => {
      Taro.navigateTo({ url: `/pages/navigator/index?sessionId=${sessionId}` })
    })
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <View className="flex flex-col min-h-screen bg-background">
      {/* Hero 区域 - 靛蓝渐变 */}
      <View className="px-5 pt-14 pb-10" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
        <View className="flex flex-col items-start">
          <View className="flex flex-row items-center gap-2 mb-3">
            <Sparkles size={22} color="#fbbf24" />
            <Text className="text-base font-bold text-yellow-300 tracking-wide">数智局伴</Text>
          </View>
          <Text className="block text-sm text-white text-opacity-90 leading-relaxed tracking-wide">
            您的线下组局伴侣
          </Text>
        </View>
      </View>

      {/* 快捷工具 - Bento Grid 风格 */}
      <View className="px-4 -mt-5 mb-5">
        <Card className="shadow-lg">
          <CardContent className="p-4">
            <View className="flex flex-row justify-between">
              {QUICK_TOOLS.map((tool) => (
                <View
                  key={tool.key}
                  className="flex flex-col items-center cursor-pointer"
                  onClick={() => goToTool(tool.path)}
                >
                  <View
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm"
                    style={{ background: tool.gradient }}
                  >
                    {tool.icon}
                  </View>
                  <Text className="block text-xs text-gray-500 mt-2">{tool.label}</Text>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>
      </View>

      {/* 继续游戏 - 如果有进行中的对局 */}
      {activeSession && (
        <View className="px-4 mb-5">
          <View
            className="cursor-pointer"
            onClick={() => goToSession(activeSession.id)}
          >
            <Card className="overflow-hidden">
              <View className="h-1" style={{ background: 'linear-gradient(90deg, #4F46E5 0%, #7C3AED 100%)' }} />
              <CardContent className="p-4">
                <View className="flex flex-row items-center justify-between">
                  <View className="flex flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Play size={20} color="#4F46E5" />
                    </View>
                    <View>
                      <Text className="block text-base font-semibold text-foreground">
                        {activeSession.game?.name || activeSession.session_name}
                      </Text>
                      <Text className="block text-xs text-gray-500 mt-1">
                        进行中 · {formatDate(activeSession.created_at)}
                      </Text>
                    </View>
                  </View>
                  <View className="flex flex-row items-center gap-1">
                    <Text className="text-xs text-primary">继续</Text>
                    <ArrowRight size={12} color="#4F46E5" />
                  </View>
                </View>
              </CardContent>
            </Card>
          </View>
        </View>
      )}

      {/* 热门桌游 - 优化后的卡片 */}
      <View className="px-4 mb-5">
        <View className="flex flex-row items-center justify-between mb-3">
          <View className="flex flex-row items-center gap-2">
            <Sparkles size={16} color="#4F46E5" />
            <Text className="block text-base font-semibold text-foreground">热门桌游</Text>
          </View>
          <View
            className="flex flex-row items-center gap-1 cursor-pointer"
            onClick={() => Taro.switchTab({ url: '/pages/games/index' })}
          >
            <Text className="text-xs text-primary">查看全部</Text>
            <ArrowRight size={12} color="#4F46E5" />
          </View>
        </View>
        <View className="flex flex-col gap-3">
          {hotGames.slice(0, 4).map((game, index) => (
            <View
              key={game.id}
              className="cursor-pointer"
              onClick={() => goToGame(game.id)}
            >
              <Card className="shadow-sm overflow-hidden">
                <View
                  className="h-1"
                  style={{ background: game.icon_bg || '#4F46E5' }}
                />
                <CardContent className="p-4">
                  <View className="flex flex-row items-start gap-3">
                    {/* 游戏图标 */}
                    <View
                      className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: game.icon_bg || '#4F46E5' }}
                    >
                      <Text className="text-2xl">{ICON_KEY_MAP[game.icon_key] || '🎲'}</Text>
                    </View>

                    {/* 游戏信息 */}
                    <View className="flex-1">
                      <View className="flex flex-row items-center gap-2 mb-1">
                        <Text className="block text-base font-bold text-foreground">{game.name}</Text>
                        {index === 0 && (
                          <View
                            className="rounded-full px-2 py-1"
                            style={{ backgroundColor: '#fef3c7' }}
                          >
                            <Text className="text-xs text-amber-600">🔥 热门</Text>
                          </View>
                        )}
                      </View>

                      {/* 基础信息 */}
                      <View className="flex flex-row items-center gap-2 mb-2">
                        <Text className="text-xs text-gray-500">👥 {game.min_players}-{game.max_players}人</Text>
                        <Text className="text-xs text-gray-300">·</Text>
                        <Text className="text-xs text-gray-500">⏱️ {game.min_duration}-{game.max_duration}分钟</Text>
                        <Text className="text-xs text-gray-300">·</Text>
                        <Text style={{ fontSize: 11, color: DIFFICULTY_META[game.difficulty]?.color || '#6b7280' }}>
                          {DIFFICULTY_META[game.difficulty]?.label || game.difficulty}
                        </Text>
                      </View>

                      {/* 类型 + 场景标签 */}
                      <View className="flex flex-row flex-wrap items-center gap-1">
                        {game.type?.map((t) => {
                          const meta = TYPE_META[t]
                          return meta ? (
                            <View key={t} className="rounded" style={{ backgroundColor: meta.bg, paddingLeft: 4, paddingRight: 4, paddingTop: 0, paddingBottom: 1 }}>
                              <Text style={{ fontSize: 10, color: meta.color, lineHeight: 1 }}>{meta.emoji} {meta.label}</Text>
                            </View>
                          ) : null
                        })}
                        {game.scene?.map((s) => {
                          const meta = SCENE_META[s]
                          return meta ? (
                            <View key={s} className="rounded" style={{ backgroundColor: meta.bg, paddingLeft: 4, paddingRight: 4, paddingTop: 0, paddingBottom: 1 }}>
                              <Text style={{ fontSize: 10, color: meta.color, lineHeight: 1 }}>{meta.emoji} {meta.label}</Text>
                            </View>
                          ) : null
                        })}
                      </View>
                    </View>

                    {/* 箭头 */}
                    <View className="flex items-center justify-center pt-2">
                      <ArrowRight size={16} color="#d1d5db" />
                    </View>
                  </View>
                </CardContent>
              </Card>
            </View>
          ))}
        </View>
      </View>

      {/* 最近对局 */}
      <View className="px-4 pb-20">
        <View className="flex flex-row items-center justify-between mb-3">
          <View className="flex flex-row items-center gap-2">
            <History size={16} color="#4F46E5" />
            <Text className="block text-base font-semibold text-foreground">最近对局</Text>
          </View>
          <View
            className="flex flex-row items-center gap-1 cursor-pointer"
            onClick={() => requireLogin(() => Taro.switchTab({ url: '/pages/history/index' }))}
          >
            <Text className="text-xs text-primary">查看全部</Text>
            <ArrowRight size={12} color="#4F46E5" />
          </View>
        </View>
        {loading ? (
          <Card className="">
            <CardContent className="flex flex-col items-center p-8">
              <Text className="block text-sm text-gray-400">加载中...</Text>
            </CardContent>
          </Card>
        ) : recentSessions.length === 0 ? (
          <Card>
            <Empty
              icon="⏱️"
              title="还没有对局记录"
              description="开始你的第一局桌游吧！"
              action={
                <Button size="sm" className="rounded-full" onClick={() => requireLogin(() => Taro.switchTab({ url: '/pages/games/index' }))}>
                  <Text className="text-white text-xs">开始第一局</Text>
                </Button>
              }
            />
          </Card>
        ) : (
          <View className="flex flex-col gap-3">
            {recentSessions.slice(0, 3).map((session) => (
              <View
                key={session.id}
                className="cursor-pointer"
                onClick={() => goToSession(session.id)}
              >
                <Card className="overflow-hidden">
                  <View 
                    className="h-1" 
                    style={{ 
                      background: session.status === 'playing' 
                        ? 'linear-gradient(90deg, #4F46E5 0%, #7C3AED 100%)' 
                        : 'linear-gradient(90deg, #059669 0%, #10b981 100%)' 
                    }} 
                  />
                  <CardContent className="p-4">
                    <View className="flex flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="block text-sm font-semibold text-foreground">
                          {session.game?.name || session.session_name}
                        </Text>
                        <View className="flex flex-row items-center gap-3 mt-2">
                          <View className="flex flex-row items-center gap-1">
                            <Timer size={12} color="#9ca3af" />
                            <Text className="text-xs text-gray-500">
                              {session.status === 'playing' ? '进行中' : '已结束'}
                            </Text>
                          </View>
                          <Text className="text-xs text-gray-400">·</Text>
                          <Text className="text-xs text-gray-500">
                            {formatDate(session.created_at)}
                          </Text>
                          {session.duration && session.status === 'finished' && (
                            <>
                              <Text className="text-xs text-gray-400">·</Text>
                              <Text className="text-xs text-gray-500">
                                {Math.floor(session.duration / 60)}分钟
                              </Text>
                            </>
                          )}
                        </View>
                      </View>
                      <ArrowRight size={12} color="#d1d5db" />
                    </View>
                  </CardContent>
                </Card>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}

export default IndexPage
