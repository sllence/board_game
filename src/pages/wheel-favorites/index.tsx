import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Bookmark, Trash2 } from 'lucide-react-taro'
import type { FC } from 'react'

const WHEEL_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B500', '#6C5CE7',
]

interface Wheel {
  id: number
  title: string
  type: 'probability' | 'inventory'
  items: any[]
  created_at: string
  updated_at: string
}

const WheelFavoritesPage: FC = () => {
  const [wheels, setWheels] = useState<Wheel[]>([])
  const [loading, setLoading] = useState(false)

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

  const fetchFavorites = async () => {
    const userId = getUserId()
    if (!userId) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      const res = await Network.request({
        url: `/api/wheels/favorites?user_id=${userId}`,
      })
      console.log('[WheelFavorites] fetch favorites:', res.data)
      const data = res.data?.data || []
      setWheels(data)
    } catch (e) {
      console.error('[WheelFavorites] fetch error:', e)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    fetchFavorites()
  })

  const handleOpen = (id: number) => {
    Taro.navigateTo({ url: `/pages/wheel-spin/index?id=${id}` })
  }

  const handleUnfavorite = (wheel: Wheel) => {
    const userId = getUserId()
    if (!userId) return
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
            fetchFavorites()
          } catch (e) {
            console.error('[WheelFavorites] unfavorite error:', e)
            Taro.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      },
    })
  }

  return (
    <View className="flex flex-col min-h-screen bg-gray-50" style={{ overflowX: 'hidden' }}>
      <View className="px-5 pt-12 pb-4 bg-white border-b border-gray-100">
        <View className="flex flex-row items-center gap-2">
          <Bookmark size={24} color="#D97706" />
          <Text className="text-lg font-bold text-gray-900">收藏的转盘</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-4" scrollY>
        {wheels.length === 0 && !loading && (
          <View className="flex flex-col items-center justify-center py-20">
            <Bookmark size={48} color="#D1D5DB" />
            <Text className="block text-gray-400 mt-4">还没有收藏</Text>
            <Text className="block text-gray-400 text-sm mt-1">从转盘详情页收藏喜欢的转盘</Text>
          </View>
        )}

        <View className="flex flex-col gap-3">
          {wheels.map((wheel) => (
            <Card key={wheel.id} className="rounded-xl overflow-hidden">
              <CardContent className="p-0">
                <View className="p-4" onClick={() => handleOpen(wheel.id)}>
                  <View className="flex flex-row items-center justify-between mb-3">
                    <Text className="text-base font-semibold text-gray-900">{wheel.title}</Text>
                    <View
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleUnfavorite(wheel)
                      }}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </View>
                  </View>

                  <View className="flex flex-row flex-wrap gap-2">
                    {wheel.items.slice(0, 6).map((item, idx) => (
                      <View
                        key={idx}
                        className="px-2 py-1 rounded-md"
                        style={{
                          backgroundColor: item.color || WHEEL_COLORS[idx % WHEEL_COLORS.length],
                        }}
                      >
                        <Text className="text-xs text-white">{item.label}</Text>
                      </View>
                    ))}
                    {wheel.items.length > 6 && (
                      <View className="px-2 py-1 rounded-md bg-gray-100">
                        <Text className="text-xs text-gray-500">+{wheel.items.length - 6}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </CardContent>
            </Card>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

export default WheelFavoritesPage
