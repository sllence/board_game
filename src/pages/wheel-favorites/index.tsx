import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Bookmark, Trash2, Trophy, Timer } from 'lucide-react-taro'
import type { FC } from 'react'

interface ProbWheelItem {
  label: string
  probability: number
}

interface InvWheelItem {
  label: string
  count: number
}

type WheelItem = ProbWheelItem | InvWheelItem

interface Wheel {
  id: number
  title: string
  type: 'probability' | 'inventory'
  items: WheelItem[]
  created_at: string
}

interface Session {
  id: number
  game_id: number
  session_name: string | null
  players: string[]
  winner: string | null
  duration: number
  status: string
  created_at: string
  game: { id: number; name: string }
  is_favorited: boolean
  favorited_at: string
}

const getUserId = (): number | undefined => {
  try {
    const cached = Taro.getStorageSync('userInfo')
    if (cached) {
      const user = JSON.parse(cached)
      return user.id
    }
  } catch { /* ignore */ }
  return undefined
}

const formatTime = (minutes: number): string => {
  if (minutes < 60) return `${minutes}分钟`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}小时${m}分钟` : `${h}小时`
}

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

const FavoritesPage: FC = () => {
  const [activeTab, setActiveTab] = useState('sessions')
  const [sessions, setSessions] = useState<Session[]>([])
  const [wheels, setWheels] = useState<Wheel[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSessionFavorites = async () => {
    const userId = getUserId()
    if (!userId) return
    setLoading(true)
    try {
      const res = await Network.request({
        url: `/api/sessions/favorites?user_id=${userId}`,
      })
      console.log('[Favorites] fetch session favorites:', res.data)
      const data = res.data?.data || []
      setSessions(data)
    } catch (e) {
      console.error('[Favorites] fetch sessions error:', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchWheelFavorites = async () => {
    const userId = getUserId()
    if (!userId) return
    setLoading(true)
    try {
      const res = await Network.request({
        url: `/api/wheels/favorites?user_id=${userId}`,
      })
      console.log('[Favorites] fetch wheel favorites:', res.data)
      const data = res.data?.data || []
      setWheels(data)
    } catch (e) {
      console.error('[Favorites] fetch wheels error:', e)
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    if (activeTab === 'sessions') {
      fetchSessionFavorites()
    } else {
      fetchWheelFavorites()
    }
  })

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    if (tab === 'sessions') {
      fetchSessionFavorites()
    } else {
      fetchWheelFavorites()
    }
  }

  // 对局操作
  const handleOpenSession = (session: Session) => {
    Taro.navigateTo({ url: `/pages/history-detail/index?id=${session.id}` })
  }

  const handleUnfavoriteSession = (session: Session) => {
    const userId = getUserId()
    const token = Taro.getStorageSync('token')
    if (!userId || !token) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    Taro.showModal({
      title: '取消收藏',
      content: '确定要取消收藏这个对局吗？',
      confirmColor: '#EF4444',
      success: async (res) => {
        if (res.confirm) {
          try {
            await Network.request({
              url: `/api/sessions/${session.id}/favorite?user_id=${userId}`,
              method: 'DELETE',
            })
            Taro.showToast({ title: '已取消收藏', icon: 'success' })
            fetchSessionFavorites()
          } catch (e) {
            console.error('[Favorites] unfavorite session error:', e)
            Taro.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      },
    })
  }

  // 转盘操作
  const handleOpenWheel = (id: number) => {
    Taro.navigateTo({ url: `/pages/wheel-spin/index?id=${id}` })
  }

  const handleUnfavoriteWheel = (wheel: Wheel) => {
    const userId = getUserId()
    const token = Taro.getStorageSync('token')
    if (!userId || !token) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    Taro.showModal({
      title: '取消收藏',
      content: '确定要取消收藏这个转盘吗？',
      confirmColor: '#EF4444',
      success: async (res) => {
        if (res.confirm) {
          try {
            await Network.request({
              url: `/api/wheels/${wheel.id}/favorite?user_id=${userId}`,
              method: 'DELETE',
            })
            Taro.showToast({ title: '已取消收藏', icon: 'success' })
            fetchWheelFavorites()
          } catch (e) {
            console.error('[Favorites] unfavorite wheel error:', e)
            Taro.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      },
    })
  }

  return (
    <View className="flex flex-col min-h-screen bg-background" style={{ overflowX: 'hidden' }}>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <View className="px-4 pt-3 bg-white border-b border-gray-100">
          <TabsList className="w-full">
            <TabsTrigger value="sessions" className="flex-1">
              <Text className="block text-sm">对局</Text>
            </TabsTrigger>
            <TabsTrigger value="wheels" className="flex-1">
              <Text className="block text-sm">转盘</Text>
            </TabsTrigger>
          </TabsList>
        </View>

        {/* 对局收藏 */}
        <TabsContent value="sessions">
          <ScrollView className="px-4 py-3" scrollY style={{ height: 'calc(100vh - 120px)' }}>
            {sessions.length === 0 && !loading && (
              <View className="flex flex-col items-center justify-center py-20">
                <Bookmark size={48} color="#D1D5DB" />
                <Text className="block text-gray-400 mt-4">还没有收藏对局</Text>
                <Text className="block text-gray-400 text-sm mt-1">在对局详情页收藏喜欢的对局</Text>
              </View>
            )}
            <View className="flex flex-col gap-3">
              {sessions.map((session) => (
                <Card key={session.id} className="rounded-xl overflow-hidden" onClick={() => handleOpenSession(session)}>
                  <CardContent className="p-4">
                    <View className="flex flex-row items-center justify-between mb-2">
                      <Text className="text-base font-semibold text-gray-900">
                        {session.game?.name || session.session_name || '未命名对局'}
                      </Text>
                      <View
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUnfavoriteSession(session)
                        }}
                      >
                        <Trash2 size={14} color="#EF4444" />
                      </View>
                    </View>
                    <View className="flex flex-row items-center gap-3 text-gray-500">
                      {session.players && session.players.length > 0 && (
                        <View className="flex flex-row items-center gap-1">
                          <Text className="text-xs">{session.players.length}人</Text>
                        </View>
                      )}
                      {session.duration > 0 && (
                        <View className="flex flex-row items-center gap-1">
                          <Timer size={12} color="#9CA3AF" />
                          <Text className="text-xs">{formatTime(session.duration)}</Text>
                        </View>
                      )}
                      {session.winner && (
                        <View className="flex flex-row items-center gap-1">
                          <Trophy size={12} color="#D97706" />
                          <Text className="text-xs">{session.winner}</Text>
                        </View>
                      )}
                      <Text className="text-xs text-gray-400 ml-auto">{formatDate(session.created_at)}</Text>
                    </View>
                  </CardContent>
                </Card>
              ))}
            </View>
          </ScrollView>
        </TabsContent>

        {/* 转盘收藏 */}
        <TabsContent value="wheels">
          <ScrollView className="px-4 py-3" scrollY style={{ height: 'calc(100vh - 120px)' }}>
            {wheels.length === 0 && !loading && (
              <View className="flex flex-col items-center justify-center py-20">
                <Bookmark size={48} color="#D1D5DB" />
                <Text className="block text-gray-400 mt-4">还没有收藏转盘</Text>
                <Text className="block text-gray-400 text-sm mt-1">从转盘详情页收藏喜欢的转盘</Text>
              </View>
            )}
            <View className="flex flex-col gap-3">
              {wheels.map((wheel) => (
                <Card key={wheel.id} className="rounded-xl overflow-hidden" onClick={() => handleOpenWheel(wheel.id)}>
                  <CardContent className="p-4">
                    <View className="flex flex-row items-center justify-between mb-2">
                      <Text className="text-base font-semibold text-gray-900">{wheel.title}</Text>
                      <View
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUnfavoriteWheel(wheel)
                        }}
                      >
                        <Trash2 size={14} color="#EF4444" />
                      </View>
                    </View>
                    <Text className="block text-xs text-gray-400">{formatDate(wheel.created_at)}</Text>
                  </CardContent>
                </Card>
              ))}
            </View>
          </ScrollView>
        </TabsContent>
      </Tabs>
    </View>
  )
}

export default FavoritesPage
