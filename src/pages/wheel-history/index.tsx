import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { Network } from '@/network'
import { Clock, Target } from 'lucide-react-taro'
import type { FC } from 'react'

interface HistoryItem {
  id: number
  result: string
  created_at: string
}

const WheelHistoryPage: FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)

  useDidShow(() => {
    const instance = Taro.getCurrentInstance()
    const id = instance.router?.params?.id
    if (id) {
      fetchHistory(Number(id))
    }
  })

  const fetchHistory = async (id: number) => {
    setLoading(true)
    try {
      const [wheelRes, historyRes] = await Promise.all([
        Network.request({ url: `/api/wheels/${id}` }),
        Network.request({ url: `/api/wheels/${id}/history` }),
      ])
      console.log('[WheelHistory] fetch:', wheelRes.data, historyRes.data)
      setTitle(wheelRes.data?.data?.title || '转盘')
      setHistory(historyRes.data?.data || [])
    } catch (e) {
      console.error('[WheelHistory] fetch error:', e)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <View className="flex flex-col min-h-screen bg-gray-50" style={{ overflowX: 'hidden' }}>
      <View className="px-5 pt-12 pb-4 bg-white border-b border-gray-100">
        <View className="flex flex-row items-center gap-2">
          <Target size={20} color="#4F46E5" />
          <Text className="text-lg font-bold text-gray-900">{title} - 历史记录</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-4" scrollY>
        {history.length === 0 && !loading && (
          <View className="flex flex-col items-center justify-center py-20">
            <Clock size={48} color="#D1D5DB" />
            <Text className="block text-gray-400 mt-4">暂无转动记录</Text>
          </View>
        )}

        <View className="flex flex-col gap-2">
          {history.map((item, index) => (
            <View
              key={item.id}
              className="flex flex-row items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100"
            >
              <View className="flex flex-row items-center gap-3">
                <View className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center">
                  <Text className="text-xs font-bold text-indigo-600">#{history.length - index}</Text>
                </View>
                <Text className="text-base font-medium text-gray-900">{item.result}</Text>
              </View>
              <Text className="text-xs text-gray-400">{formatTime(item.created_at)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

export default WheelHistoryPage
