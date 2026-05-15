import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Settings, Trash2, Share2, ChevronRight, Target } from 'lucide-react-taro'
import type { FC } from 'react'

const WHEEL_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B500', '#6C5CE7',
]

interface Wheel {
  id: number
  title: string
  items: { label: string; color?: string }[]
  created_at: string
  updated_at: string
}

const WheelManagePage: FC = () => {
  const [wheels, setWheels] = useState<Wheel[]>([])
  const [loading, setLoading] = useState(false)

  const fetchWheels = async () => {
    setLoading(true)
    try {
      const res = await Network.request({ url: '/api/wheels' })
      console.log('[WheelManage] fetch wheels:', res.data)
      setWheels(res.data?.data || [])
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

  const handleEdit = (id: number) => {
    Taro.navigateTo({ url: `/pages/wheel-edit/index?id=${id}` })
  }

  const handleSpin = (id: number) => {
    Taro.navigateTo({ url: `/pages/wheel-spin/index?id=${id}` })
  }

  const handleDelete = (id: number) => {
    Taro.showModal({
      title: '确认删除',
      content: '删除后无法恢复，是否继续？',
      confirmColor: '#EF4444',
      success: async (res) => {
        if (res.confirm) {
          try {
            await Network.request({ url: `/api/wheels/${id}`, method: 'DELETE' })
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

  const handleShare = (wheel: Wheel) => {
    const shareData = {
      title: wheel.title,
      items: wheel.items,
    }
    const shareStr = JSON.stringify(shareData)
    Taro.setClipboardData({
      data: shareStr,
      success: () => {
        Taro.showToast({ title: '转盘数据已复制', icon: 'success' })
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
                <View className="p-4">
                  <View className="flex flex-row items-center justify-between mb-3">
                    <Text className="text-base font-semibold text-gray-900">{wheel.title}</Text>
                    <View className="flex flex-row gap-1">
                      <View
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100"
                        onClick={() => handleEdit(wheel.id)}
                      >
                        <Settings size={16} color="#6B7280" />
                      </View>
                      <View
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100"
                        onClick={() => handleShare(wheel)}
                      >
                        <Share2 size={16} color="#6B7280" />
                      </View>
                      <View
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50"
                        onClick={() => handleDelete(wheel.id)}
                      >
                        <Trash2 size={16} color="#EF4444" />
                      </View>
                    </View>
                  </View>

                  <View className="flex flex-row flex-wrap gap-2 mb-3">
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

                  <View
                    className="flex flex-row items-center justify-center py-2 rounded-lg bg-indigo-50"
                    onClick={() => handleSpin(wheel.id)}
                  >
                    <Target size={16} color="#4F46E5" />
                    <Text className="text-sm font-medium text-indigo-600 ml-1">开始转动</Text>
                    <ChevronRight size={16} color="#4F46E5" />
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
