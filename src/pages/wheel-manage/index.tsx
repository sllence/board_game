import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Settings, Trash2, Bookmark, Target } from 'lucide-react-taro'
import type { FC } from 'react'

interface Wheel {
  id: number
  title: string
  type: 'probability' | 'inventory'
  items: any[]
  created_at: string
  updated_at: string
  is_owner?: boolean
  is_favorited?: boolean
}

const WheelManagePage: FC = () => {
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

  const fetchWheels = async () => {
    setLoading(true)
    try {
      const userId = getUserId()
      // 获取用户自己创建的转盘
      const res = await Network.request({
        url: userId ? `/api/wheels?user_id=${userId}` : '/api/wheels',
      })
      console.log('[WheelManage] fetch wheels:', res.data)
      const myWheels: Wheel[] = res.data?.data || []

      // 获取收藏的转盘
      let favWheels: Wheel[] = []
      if (userId) {
        try {
          const favRes = await Network.request({
            url: `/api/wheels/favorites?user_id=${userId}`,
          })
          favWheels = (favRes.data?.data || []).map((w: Wheel) => ({
            ...w,
            is_favorited: true,
            is_owner: false,
          }))
        } catch (e) {
          console.error('[WheelManage] fetch favorites error:', e)
        }
      }

      // 合并：自己的转盘 + 收藏的转盘（去重）
      const myIds = new Set(myWheels.map(w => w.id))
      const combined = [...myWheels, ...favWheels.filter(w => !myIds.has(w.id))]
      setWheels(combined)
    } catch (e) {
      console.error('[WheelManage] fetch error:', e)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    fetchWheels()
  })

  const handleAdd = () => {
    Taro.navigateTo({ url: '/pages/wheel-edit/index' })
  }

  const handleEdit = (wheel: Wheel) => {
    if (!wheel.is_owner) {
      Taro.showToast({ title: '收藏的转盘不可编辑', icon: 'none' })
      return
    }
    Taro.navigateTo({ url: `/pages/wheel-edit/index?id=${wheel.id}` })
  }

  const handleSpin = (id: number) => {
    Taro.navigateTo({ url: `/pages/wheel-spin/index?id=${id}` })
  }

  const handleDelete = (wheel: Wheel) => {
    if (!wheel.is_owner) {
      Taro.showToast({ title: '收藏的转盘不可删除', icon: 'none' })
      return
    }
    Taro.showModal({
      title: '确认删除',
      content: '删除后无法恢复，是否继续？',
      confirmColor: '#EF4444',
      success: async (res) => {
        if (res.confirm) {
          try {
            await Network.request({ url: `/api/wheels/${wheel.id}`, method: 'DELETE' })
            Taro.showToast({ title: '已删除', icon: 'success' })
            fetchWheels()
          } catch (e) {
            console.error('[WheelManage] delete error:', e)
            Taro.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      },
    })
  }

  const handleUnfavorite = async (wheel: Wheel) => {
    const userId = getUserId()
    if (!userId) {
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
            fetchWheels()
          } catch (e) {
            console.error('[WheelManage] unfavorite error:', e)
            Taro.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      },
    })
  }

  return (
    <View className="flex flex-col min-h-screen bg-gray-50" style={{ overflowX: 'hidden' }}>
      <View className="px-5 pt-12 pb-4 bg-white border-b border-gray-100">
        <View className="flex flex-row items-center justify-between">
          <View className="flex flex-row items-center gap-2">
            <Target size={24} color="#4F46E5" />
            <Text className="text-lg font-bold text-gray-900">我的转盘</Text>
          </View>
          <Button size="sm" onClick={handleAdd}>
            <Text className="text-sm font-medium text-white">+ 新建</Text>
          </Button>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-4" scrollY>
        {wheels.length === 0 && !loading && (
          <View className="flex flex-col items-center justify-center py-20">
            <Target size={48} color="#D1D5DB" />
            <Text className="block text-gray-400 mt-4">还没有转盘</Text>
            <Text className="block text-gray-400 text-sm mt-1">点击右上角新建一个吧</Text>
          </View>
        )}

        <View className="flex flex-col gap-3">
          {wheels.map((wheel) => (
            <Card key={wheel.id} className="rounded-xl overflow-hidden">
              <CardContent className="p-0">
                <View className="p-4" onClick={() => handleSpin(wheel.id)}>
                  <View className="flex flex-row items-center justify-between mb-3">
                    <Text className="text-base font-semibold text-gray-900">{wheel.title}</Text>
                    <View className="flex flex-row gap-1" onClick={(e) => e.stopPropagation()}>
                      {wheel.is_owner ? (
                        <>
                          <View
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100"
                            onClick={() => handleEdit(wheel)}
                          >
                            <Settings size={16} color="#6B7280" />
                          </View>
                          <View
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50"
                            onClick={() => handleDelete(wheel)}
                          >
                            <Trash2 size={16} color="#EF4444" />
                          </View>
                        </>
                      ) : (
                        <View
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50"
                          onClick={() => handleUnfavorite(wheel)}
                        >
                          <Bookmark size={16} color="#EF4444" />
                        </View>
                      )}
                    </View>
                  </View>

                  <View className="flex flex-row items-center justify-between">
                    <Text className="text-xs text-gray-400">
                      {wheel.created_at ? new Date(wheel.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) : ''}
                    </Text>
                    {!wheel.is_owner && (
                      <View className="px-2 py-0 rounded-full bg-amber-50">
                        <Text className="text-xs font-medium text-amber-600">收藏</Text>
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

export default WheelManagePage
