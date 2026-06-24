import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Empty } from '@/components/ui/empty'
import { Clock, History, Trophy, Bookmark } from 'lucide-react-taro'
import { checkLogin, getCurrentUser } from '@/utils/auth'
import type { FC } from 'react'

interface GameSession {
  id: number
  game_id: number
  session_name: string
  players: string[]
  winner: string
  duration: number
  status: string
  scoring_snapshot: { name: string; score: number }[]
  created_at: string
  game?: { id: number; name: string } | null
  is_favorited?: boolean
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  playing: { label: '进行中', color: '#3b82f6', bg: '#eff6ff' },
  finished: { label: '已结束', color: '#059669', bg: '#ecfdf5' },
}

const STATUS_FILTERS = [
  { key: '', label: '全部' },
  { key: 'playing', label: '进行中' },
  { key: 'finished', label: '已结束' },
]

const PAGE_SIZE = 10

const HistoryPage: FC = () => {
  const [sessions, setSessions] = useState<GameSession[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)

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
    resetAndFetch(statusFilter)
  })

  const resetAndFetch = async (status: string) => {
    setLoading(true)
    setPage(1)
    setSessions([])
    await fetchSessions(status, 1, true)
  }

  const fetchSessions = async (status: string, pageNum: number, reset = false) => {
    const currentUser = getCurrentUser()
    if (!currentUser?.id) {
      setSessions([])
      setLoading(false)
      return
    }

    try {
      const params = new URLSearchParams({ user_id: String(currentUser.id) })
      if (status) params.set('status', status)
      // 后端 findAll 返回最多 50 条，前端做分页切片
      const res = await Network.request({ url: `/api/sessions?${params}` })
      const all: GameSession[] = res.data?.data || []
      const slice = all.slice(0, pageNum * PAGE_SIZE)
      setSessions(slice)
      setHasMore(all.length > pageNum * PAGE_SIZE)
      setPage(pageNum)
    } catch (err) {
      console.error('[HistoryPage] fetchSessions error:', err)
      if (reset) setSessions([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleFilterChange = (status: string) => {
    setStatusFilter(status)
    resetAndFetch(status)
  }

  const loadMore = () => {
    setLoadingMore(true)
    fetchSessions(statusFilter, page + 1)
  }

  const toggleFavorite = async (session: GameSession, e?: any) => {
    if (e) e.stopPropagation()
    const currentUser = getCurrentUser()
    if (!currentUser?.id) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    try {
      if (session.is_favorited) {
        await Network.request({
          url: `/api/sessions/${session.id}/favorite?user_id=${currentUser.id}`,
          method: 'DELETE',
        })
        Taro.showToast({ title: '已取消收藏', icon: 'none' })
      } else {
        await Network.request({
          url: `/api/sessions/${session.id}/favorite`,
          method: 'POST',
          data: { user_id: currentUser.id },
        })
        Taro.showToast({ title: '已收藏', icon: 'success' })
      }
      setSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, is_favorited: !s.is_favorited } : s))
      )
    } catch (err) {
      console.error('[HistoryPage] toggleFavorite error:', err)
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
      {/* 顶部标题区 */}
      <View className="px-5 pt-12 pb-5" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
        <View className="flex flex-row items-center gap-2 mb-1">
          <History size={20} color="#fbbf24" />
          <Text className="text-sm font-medium text-yellow-300">对局</Text>
        </View>
        <Text className="block text-xl font-bold text-white mb-4">对局历史</Text>
        {/* 筛选 tabs */}
        <View className="flex flex-row gap-2">
          {STATUS_FILTERS.map((f) => (
            <View
              key={f.key}
              className="rounded-full px-4 py-2 cursor-pointer"
              style={{
                backgroundColor: statusFilter === f.key ? '#fff' : 'rgba(255,255,255,0.2)',
              }}
              onClick={() => handleFilterChange(f.key)}
            >
              <Text
                className="text-xs font-medium"
                style={{ color: statusFilter === f.key ? '#4F46E5' : '#fff' }}
              >
                {f.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 列表 */}
      <View className="flex-1 px-4 pt-4 pb-20">
        {loading ? (
          <View className="flex items-center justify-center py-20">
            <Text className="block text-gray-400 text-sm">加载中...</Text>
          </View>
        ) : sessions.length === 0 ? (
          <Card className="mt-2">
            <Empty
              icon="🏆"
              title="暂无对局记录"
              description="开始你的第一局桌游吧！"
            />
          </Card>
        ) : (
          <View className="flex flex-col gap-3">
            {sessions.map((session) => {
              const statusInfo = STATUS_MAP[session.status] || { label: session.status, color: '#9ca3af', bg: '#f3f4f6' }
              const playerList: string[] = Array.isArray(session.players) ? session.players : []
              const scores = Array.isArray(session.scoring_snapshot) ? session.scoring_snapshot : []
              return (
                <Card
                  key={session.id}
                  className="shadow-sm"
                  onClick={() => Taro.navigateTo({ url: `/pages/navigator/index?sessionId=${session.id}` })}
                >
                  <CardContent className="p-4">
                    {/* 头部 */}
                    <View className="flex flex-row items-center justify-between mb-3">
                      <Text className="block text-base font-semibold text-foreground flex-1 mr-2">
                        {session.game?.name || session.session_name || '未命名对局'}
                      </Text>
                      <View className="flex flex-row items-center gap-2 flex-shrink-0">
                        <View
                          className="w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: session.is_favorited ? '#FEF3C7' : '#f3f4f6' }}
                          onClick={(e) => toggleFavorite(session, e)}
                        >
                          <Bookmark size={14} color={session.is_favorited ? '#D97706' : '#9ca3af'} />
                        </View>
                        <View className="rounded-full px-2 py-1" style={{ backgroundColor: statusInfo.bg }}>
                          <Text className="text-xs font-medium" style={{ color: statusInfo.color }}>{statusInfo.label}</Text>
                        </View>
                      </View>
                    </View>

                    {/* 信息行 */}
                    <View className="flex flex-row items-center gap-3 mb-3">
                      <View className="flex flex-row items-center gap-1">
                        <Clock size={12} color="#9ca3af" />
                        <Text className="text-xs text-gray-400">{formatDuration(session.duration)}</Text>
                      </View>
                      <Text className="text-xs text-gray-300">·</Text>
                      <Text className="text-xs text-gray-400">{formatDate(session.created_at)}</Text>
                      {playerList.length > 0 && (
                        <>
                          <Text className="text-xs text-gray-300">·</Text>
                          <Text className="text-xs text-gray-400">{playerList.length}人</Text>
                        </>
                      )}
                    </View>

                    {/* 胜者 */}
                    {session.winner && (
                      <View className="flex flex-row items-center gap-2 bg-amber-50 rounded-xl px-3 py-2 mb-2">
                        <Trophy size={12} color="#d97706" />
                        <Text className="text-xs font-semibold text-amber-700">🏆 {session.winner}</Text>
                      </View>
                    )}

                    {/* 得分快照 */}
                    {scores.length > 0 && (
                      <View className="flex flex-row flex-wrap gap-2">
                        {scores.sort((a, b) => b.score - a.score).map((s, idx) => (
                          <View key={idx} className="flex flex-row items-center gap-1 bg-gray-50 rounded-lg px-2 py-1">
                            <Text className="text-xs text-gray-500">{s.name}</Text>
                            <Text className="text-xs font-bold text-indigo-600">{s.score}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </CardContent>
                </Card>
              )
            })}

            {/* 加载更多 */}
            {hasMore && (
              <View
                className="flex items-center justify-center py-4 cursor-pointer"
                onClick={loadMore}
              >
                {loadingMore ? (
                  <Text className="text-sm text-gray-400">加载中...</Text>
                ) : (
                  <Text className="text-sm text-indigo-500">加载更多</Text>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  )
}

export default HistoryPage
