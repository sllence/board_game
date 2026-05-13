import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, Trophy, Calendar, Gamepad2, ArrowLeft } from 'lucide-react-taro'
import { Network } from '@/network'
import type { FC } from 'react'

interface PlayerInfo {
  name: string
  score: number
}

interface SessionData {
  id: number
  board_game_id: number
  session_name: string
  status: string
  duration: number
  winner?: string
  created_at: string
  players?: PlayerInfo[]
  scoring_snapshot?: Array<{ name: string; score: number }>
  board_game?: { name: string }
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  playing: { label: '进行中', color: '#16a34a', bg: '#dcfce7' },
  finished: { label: '已结束', color: '#1d4ed8', bg: '#dbeafe' },
  cancelled: { label: '已取消', color: '#dc2626', bg: '#fee2e2' }
}

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0) return `${m}分${s}秒`
  return `${s}秒`
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  const hour = d.getHours().toString().padStart(2, '0')
  const minute = d.getMinutes().toString().padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

const SessionDetailPage: FC = () => {
  const router = useRouter()
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSession = async () => {
    const id = router.params?.id
    if (!id) {
      Taro.showToast({ title: '参数错误', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      const res = await Network.request({ url: `/api/sessions/${id}` })
      console.log('[SessionDetailPage] fetchSession response:', res.data)
      setSession(res.data?.data || null)
    } catch (err) {
      console.error('[SessionDetailPage] fetchSession error:', err)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSession()
  }, [])

  if (loading) {
    return (
      <View className="flex flex-col min-h-screen bg-[#f5f5f7] items-center justify-center">
        <Text className="block text-gray-500">加载中...</Text>
      </View>
    )
  }

  if (!session) {
    return (
      <View className="flex flex-col min-h-screen bg-[#f5f5f7] items-center justify-center">
        <Text className="block text-gray-500">对局不存在</Text>
        <Button className="mt-4" onClick={() => Taro.navigateBack()}>
          <Text>返回</Text>
        </Button>
      </View>
    )
  }

  const statusInfo = STATUS_MAP[session.status] || { label: session.status, color: '#9ca3af', bg: '#f3f4f6' }
  const playerList: PlayerInfo[] = Array.isArray(session.players) ? session.players : []
  const scores = Array.isArray(session.scoring_snapshot) ? session.scoring_snapshot : []
  const sortedScores = [...scores].sort((a, b) => b.score - a.score)

  return (
    <View className="flex flex-col min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <View className="px-4 pt-14 pb-4 bg-white shadow-sm">
        <View className="flex flex-row items-center gap-3">
          <View className="p-2 rounded-full bg-gray-100" onClick={() => Taro.navigateBack()}>
            <ArrowLeft size={20} color="#374151" />
          </View>
          <Text className="block text-lg font-bold text-gray-900">对局详情</Text>
        </View>
      </View>

      {/* Content */}
      <View className="flex-1 px-4 py-4">
        {/* Session Info Card */}
        <Card className="border-0 shadow-sm mb-4">
          <CardContent className="p-4">
            <Text className="block text-xl font-bold text-[#1e1b4b] mb-2">
              {session.session_name || '未命名对局'}
            </Text>
            {session.board_game?.name && (
              <View className="flex flex-row items-center gap-2 mb-2">
                <Gamepad2 size={14} color="#6366f1" />
                <Text className="block text-sm text-indigo-600">{session.board_game.name}</Text>
              </View>
            )}
            <View className="flex flex-row items-center justify-between mt-3">
              <View className="rounded-full px-3 py-1" style={{ backgroundColor: statusInfo.bg }}>
                <Text className="text-xs font-medium" style={{ color: statusInfo.color }}>{statusInfo.label}</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="border-0 shadow-sm mb-4">
          <CardContent className="p-4">
            <View className="grid grid-cols-2 gap-4">
              <View className="flex flex-col items-center">
                <View className="flex flex-row items-center gap-2 mb-1">
                  <Clock size={16} color="#6b7280" />
                  <Text className="block text-sm text-gray-500">时长</Text>
                </View>
                <Text className="block text-lg font-bold text-gray-800">{formatDuration(session.duration)}</Text>
              </View>
              <View className="flex flex-col items-center">
                <View className="flex flex-row items-center gap-2 mb-1">
                  <Calendar size={16} color="#6b7280" />
                  <Text className="block text-sm text-gray-500">创建时间</Text>
                </View>
                <Text className="block text-lg font-bold text-gray-800">{formatDate(session.created_at)}</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Winner */}
        {session.winner && (
          <Card className="border-0 shadow-sm mb-4">
            <CardContent className="p-4">
              <View className="flex flex-row items-center gap-3 bg-amber-50 rounded-xl p-4">
                <Trophy size={24} color="#d97706" />
                <View className="flex-1">
                  <Text className="block text-xs text-amber-700 mb-1">胜者</Text>
                  <Text className="block text-lg font-bold text-amber-800">{session.winner}</Text>
                </View>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Players */}
        {playerList.length > 0 && (
          <Card className="border-0 shadow-sm mb-4">
            <CardContent className="p-4">
              <Text className="block text-sm font-semibold text-gray-700 mb-3">参与者</Text>
              <View className="flex flex-row flex-wrap gap-2">
                {playerList.map((p, idx) => (
                  <View key={idx} className="bg-gray-100 rounded-full px-4 py-2">
                    <Text className="block text-sm text-gray-700">{p.name}</Text>
                  </View>
                ))}
              </View>
            </CardContent>
          </Card>
        )}

        {/* Scores */}
        {sortedScores.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <Text className="block text-sm font-semibold text-gray-700 mb-3">最终得分</Text>
              <View className="flex flex-col gap-3">
                {sortedScores.map((s, idx) => (
                  <View key={idx} className="flex flex-row items-center justify-between">
                    <View className="flex flex-row items-center gap-3">
                      <View 
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ 
                          backgroundColor: idx === 0 ? '#fef3c7' : idx === 1 ? '#f3f4f6' : idx === 2 ? '#fef3c7' : '#f3f4f6',
                        }}
                      >
                        <Text className="text-xs font-bold" style={{ color: idx === 0 ? '#d97706' : '#4b5563' }}>
                          {idx + 1}
                        </Text>
                      </View>
                      <Text className="block text-base text-gray-800">{s.name}</Text>
                      {idx === 0 && <Trophy size={14} color="#f59e0b" />}
                    </View>
                    <Text className="block text-lg font-bold" style={{ color: idx === 0 ? '#d97706' : '#4b5563' }}>
                      {s.score}
                    </Text>
                  </View>
                ))}
              </View>
            </CardContent>
          </Card>
        )}
      </View>
    </View>
  )
}

export default SessionDetailPage
