import { View, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, History, Gamepad2 } from 'lucide-react-taro'
import type { FC } from 'react'

interface PlayerInfo {
  name: string
  score: number
}

interface GameSession {
  id: number
  game_id: number
  session_name: string
  players: PlayerInfo[]
  winner: string
  rounds: number
  duration: number
  status: string
  scoring_snapshot: { name: string; score: number }[]
  created_at: string
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  playing: { label: '进行中', color: '#3b82f6' },
  finished: { label: '已结束', color: '#10b981' },
}

const HistoryPage: FC = () => {
  const [sessions, setSessions] = useState<GameSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const res = await Network.request({ url: '/api/sessions/recent' })
      console.log('[HistoryPage] fetchSessions response:', res.data)
      setSessions(res.data?.data || [])
    } catch (err) {
      console.error('[HistoryPage] fetchSessions error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return '-'
    const m = Math.floor(seconds / 60)
    if (m < 60) return `${m}分钟`
    return `${Math.floor(m / 60)}小时${m % 60}分钟`
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <View className="flex flex-col min-h-screen bg-background">
      {/* 标题 */}
      <View className="px-4 pt-12 pb-4">
        <Text className="block text-xl font-bold text-foreground">对局历史</Text>
        <Text className="block text-sm text-muted-foreground mt-1">回顾你的桌游对局记录</Text>
      </View>

      {/* 列表 */}
      <View className="flex-1 px-4 pb-20">
        {loading ? (
          <View className="flex items-center justify-center py-20">
            <Text className="block text-muted-foreground text-sm">加载中...</Text>
          </View>
        ) : sessions.length === 0 ? (
          <View className="flex flex-col items-center py-20">
            <Gamepad2 size={48} color="#d1d5db" />
            <Text className="block text-muted-foreground text-sm mt-4">暂无对局记录</Text>
            <Text className="block text-xs text-muted-foreground mt-1">开始你的第一局桌游吧！</Text>
          </View>
        ) : (
          <View className="flex flex-col gap-3">
            {sessions.map((session) => {
              const statusInfo = STATUS_MAP[session.status] || { label: session.status, color: '#9ca3af' }
              const playerList: PlayerInfo[] = Array.isArray(session.players) ? session.players : []
              const scores = Array.isArray(session.scoring_snapshot) ? session.scoring_snapshot : []
              return (
                <Card key={session.id}>
                  <CardContent className="p-4">
                    {/* 头部 */}
                    <View className="flex flex-row items-center justify-between mb-2">
                      <Text className="block text-sm font-semibold text-foreground">{session.session_name || '未命名对局'}</Text>
                      <Badge variant={session.status === 'finished' ? 'default' : 'secondary'}>
                        <Text className="text-xs" style={{ color: statusInfo.color }}>{statusInfo.label}</Text>
                      </Badge>
                    </View>

                    {/* 信息 */}
                    <View className="flex flex-row items-center gap-3 mb-2">
                      <View className="flex flex-row items-center gap-1">
                        <Clock size={12} color="#9ca3af" />
                        <Text className="text-xs text-muted-foreground">{formatDuration(session.duration)}</Text>
                      </View>
                      <Text className="text-xs text-muted-foreground">{formatDate(session.created_at)}</Text>
                    </View>

                    {/* 玩家列表 */}
                    {playerList.length > 0 && (
                      <View className="flex flex-row flex-wrap gap-1 mb-2">
                        {playerList.map((p, idx) => (
                          <Badge key={idx} variant="secondary">
                            <Text className="text-xs">{p.name}</Text>
                          </Badge>
                        ))}
                      </View>
                    )}

                    {/* 分数/胜者 */}
                    {session.winner && (
                      <View className="flex flex-row items-center gap-1">
                        <History size={12} color="#1a1a2e" />
                        <Text className="text-xs text-muted-foreground">胜者: </Text>
                        <Text className="text-xs font-medium text-foreground">{session.winner}</Text>
                      </View>
                    )}
                    {scores.length > 0 && (
                      <View className="flex flex-row flex-wrap gap-2 mt-1">
                        {scores.map((s, idx) => (
                          <Text key={idx} className="text-xs text-muted-foreground">
                            {s.name}: {s.score}分
                          </Text>
                        ))}
                      </View>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </View>
        )}
      </View>
    </View>
  )
}

export default HistoryPage
