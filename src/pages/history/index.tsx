import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, History, Trophy } from 'lucide-react-taro'
import { checkLogin, getCurrentUser } from '@/utils/auth'
import type { FC } from 'react'

interface GameSession {
  id: number
  game_id: number
  session_name: string
  players: string[]
  winner: string
  duration_seconds: number
  status: string
  scoring_snapshot: { name: string; score: number }[]
  created_at: string
  game?: { id: number; name: string } | null
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  playing: { label: '进行中', color: '#3b82f6', bg: '#eff6ff' },
  finished: { label: '已结束', color: '#059669', bg: '#ecfdf5' },
}

const HistoryPage: FC = () => {
  const [sessions, setSessions] = useState<GameSession[]>([])
  const [loading, setLoading] = useState(true)

  useDidShow(() => {
    if (!checkLogin()) {
      Taro.showModal({
        title: '需要登录',
        content: '请先登录后再查看对局历史',
        confirmText: '去登录',
        cancelText: '返回',
        showCancel: true,
        success: (res) => {
          if (res.confirm) {
            Taro.switchTab({ url: '/pages/profile/index' })
          } else {
            Taro.switchTab({ url: '/pages/index/index' })
          }
        }
      })
      return
    }
    fetchSessions()
  })

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const currentUser = getCurrentUser()
      // 防御性编程：确保user_id存在
      if (!currentUser?.id) {
        console.warn('[HistoryPage] no current user, showing empty')
        setSessions([])
        return
      }
      
      const url = `/api/sessions/recent?user_id=${currentUser.id}`
      const res = await Network.request({ url })
      console.log('[HistoryPage] fetchSessions response:', res.data)
      setSessions(res.data?.data || [])
    } catch (err) {
      console.error('[HistoryPage] fetchSessions error:', err)
      // 出错时也展示空列表，而不是崩溃
      setSessions([])
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
    <View className="flex flex-col min-h-screen bg-[#f5f5f7]">
      {/* 顶部标题区 */}
      <View className="px-5 pt-12 pb-6" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
        <View className="flex flex-row items-center gap-2 mb-1">
          <History size={20} color="#fbbf24" />
          <Text className="text-sm font-medium text-yellow-300">对局</Text>
        </View>
        <Text className="block text-xl font-bold text-white">对局历史</Text>
        <Text className="block text-sm text-white text-opacity-80 mt-1">回顾你的桌游对局记录</Text>
      </View>

      {/* 列表 */}
      <View className="flex-1 px-4 -mt-3 pb-20">
        {loading ? (
          <View className="flex items-center justify-center py-20">
            <Text className="block text-gray-400 text-sm">加载中...</Text>
          </View>
        ) : sessions.length === 0 ? (
          <Card className="border-0">
            <CardContent className="flex flex-col items-center p-10">
              <View className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <Trophy size={28} color="#d1d5db" />
              </View>
              <Text className="block text-sm text-gray-400">暂无对局记录</Text>
              <Text className="block text-xs text-gray-300 mt-1">开始你的第一局桌游吧！</Text>
            </CardContent>
          </Card>
        ) : (
          <View className="flex flex-col gap-3">
            {sessions.map((session) => {
              const statusInfo = STATUS_MAP[session.status] || { label: session.status, color: '#9ca3af', bg: '#f3f4f6' }
              const playerList: string[] = Array.isArray(session.players) ? session.players : []
              const scores = Array.isArray(session.scoring_snapshot) ? session.scoring_snapshot : []
              const handleSessionClick = () => {
                Taro.navigateTo({ url: `/pages/navigator/index?sessionId=${session.id}` })
              }
              return (
                <Card key={session.id} className="border-0 shadow-sm" onClick={handleSessionClick}>
                  <CardContent className="p-4">
                    {/* 头部 */}
                    <View className="flex flex-row items-center justify-between mb-3">
                      <Text className="block text-base font-semibold text-[#1e1b4b]">
                        {session.game?.name || session.session_name || '未命名对局'}
                      </Text>
                      <View className="rounded-full px-2 py-1" style={{ backgroundColor: statusInfo.bg }}>
                        <Text className="text-xs font-medium" style={{ color: statusInfo.color }}>{statusInfo.label}</Text>
                      </View>
                    </View>

                    {/* 信息 */}
                    <View className="flex flex-row items-center gap-3 mb-3">
                      <View className="flex flex-row items-center gap-1">
                        <Clock size={12} color="#9ca3af" />
                        <Text className="text-xs text-gray-400">{formatDuration(session.duration_seconds)}</Text>
                      </View>
                      <Text className="text-xs text-gray-400">{formatDate(session.created_at)}</Text>
                    </View>

                    {/* 玩家列表 */}
                    {playerList.length > 0 && (
                      <View className="flex flex-row flex-wrap gap-2 mb-3">
                        {playerList.map((name, idx) => (
                          <View key={idx} className="bg-gray-100 rounded-full px-3 py-1">
                            <Text className="text-xs text-gray-600">{name}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* 胜者 */}
                    {session.winner && (
                      <View className="flex flex-row items-center gap-2 bg-amber-50 rounded-xl px-3 py-2">
                        <Trophy size={14} color="#d97706" />
                        <Text className="text-xs text-amber-700">胜者: </Text>
                        <Text className="text-xs font-semibold text-amber-800">{session.winner}</Text>
                      </View>
                    )}
                    {scores.length > 0 && (
                      <View className="flex flex-row flex-wrap gap-2 mt-2">
                        {scores.map((s, idx) => (
                          <Text key={idx} className="text-xs text-gray-400">
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
