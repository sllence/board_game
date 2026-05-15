import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Save } from 'lucide-react-taro'
import type { FC } from 'react'

const WHEEL_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B500', '#6C5CE7',
  '#00B894', '#E17055', '#74B9FF', '#A29BFE', '#FD79A8',
]

interface WheelItem {
  label: string
  color?: string
}

const WheelEditPage: FC = () => {
  const [wheelId, setWheelId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [items, setItems] = useState<WheelItem[]>([
    { label: '', color: WHEEL_COLORS[0] },
    { label: '', color: WHEEL_COLORS[1] },
  ])
  const [saving, setSaving] = useState(false)

  useDidShow(() => {
    const instance = Taro.getCurrentInstance()
    const id = instance.router?.params?.id
    if (id) {
      setWheelId(Number(id))
      fetchWheel(Number(id))
    }
  })

  const fetchWheel = async (id: number) => {
    try {
      const res = await Network.request({ url: `/api/wheels/${id}` })
      console.log('[WheelEdit] fetch wheel:', res.data)
      const wheel = res.data?.data
      if (wheel) {
        setTitle(wheel.title)
        setItems(wheel.items?.length > 0 ? wheel.items : [])
      }
    } catch (e) {
      console.error('[WheelEdit] fetch error:', e)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    }
  }

  const handleAddItem = () => {
    const color = WHEEL_COLORS[items.length % WHEEL_COLORS.length]
    setItems([...items, { label: '', color }])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 2) {
      Taro.showToast({ title: '至少需要2个选项', icon: 'none' })
      return
    }
    const newItems = [...items]
    newItems.splice(index, 1)
    setItems(newItems)
  }

  const handleItemChange = (index: number, value: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], label: value }
    setItems(newItems)
  }

  const handleSave = async () => {
    if (!title.trim()) {
      Taro.showToast({ title: '请输入转盘名称', icon: 'none' })
      return
    }
    const validItems = items.filter((i) => i.label.trim())
    if (validItems.length < 2) {
      Taro.showToast({ title: '至少需要2个有效选项', icon: 'none' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        items: validItems.map((item, idx) => ({
          label: item.label.trim(),
          color: item.color || WHEEL_COLORS[idx % WHEEL_COLORS.length],
        })),
      }

      if (wheelId) {
        await Network.request({
          url: `/api/wheels/${wheelId}`,
          method: 'PUT',
          data: payload,
        })
        Taro.showToast({ title: '保存成功', icon: 'success' })
      } else {
        await Network.request({
          url: '/api/wheels',
          method: 'POST',
          data: payload,
        })
        Taro.showToast({ title: '创建成功', icon: 'success' })
      }
      setTimeout(() => {
        Taro.navigateBack()
      }, 800)
    } catch (e) {
      console.error('[WheelEdit] save error:', e)
      Taro.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <View className="flex flex-col min-h-screen bg-gray-50" style={{ overflowX: 'hidden' }}>
      <View className="px-5 pt-12 pb-4 bg-white border-b border-gray-100">
        <Text className="text-lg font-bold text-gray-900">
          {wheelId ? '编辑转盘' : '新建转盘'}
        </Text>
      </View>

      <ScrollView className="flex-1 px-4 py-4" scrollY>
        <View className="mb-4">
          <Text className="block text-sm font-medium text-gray-700 mb-2">转盘名称</Text>
          <Input
            className="bg-white rounded-xl border-gray-200"
            placeholder="例如：今天谁买单"
            value={title}
            onInput={(e) => setTitle(e.detail.value)}
          />
        </View>

        <View className="mb-4">
          <View className="flex flex-row items-center justify-between mb-2">
            <Text className="text-sm font-medium text-gray-700">选项</Text>
            <Text className="text-xs text-gray-400">{items.filter((i) => i.label.trim()).length} / {items.length}</Text>
          </View>

          <View className="flex flex-col gap-2">
            {items.map((item, index) => (
              <View
                key={index}
                className="flex flex-row items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-200"
              >
                <View
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color || WHEEL_COLORS[index % WHEEL_COLORS.length] }}
                />
                <View className="flex-1">
                  <Input
                    className="border-0 bg-transparent"
                    placeholder={`选项 ${index + 1}`}
                    value={item.label}
                    onInput={(e) => handleItemChange(index, e.detail.value)}
                  />
                </View>
                <View
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  onClick={() => handleRemoveItem(index)}
                >
                  <Trash2 size={16} color="#EF4444" />
                </View>
              </View>
            ))}
          </View>

          <View
            className="flex flex-row items-center justify-center py-3 mt-2 rounded-xl border-2 border-dashed border-gray-200"
            onClick={handleAddItem}
          >
            <Plus size={20} color="#9CA3AF" />
            <Text className="text-sm text-gray-500 ml-1">添加选项</Text>
          </View>
        </View>
      </ScrollView>

      <View className="px-4 py-3 bg-white border-t border-gray-100" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <Button className="w-full" onClick={handleSave} disabled={saving}>
          <Save size={18} color="#fff" />
          <Text className="text-sm font-medium text-white ml-1">
            {saving ? '保存中...' : '保存转盘'}
          </Text>
        </Button>
      </View>
    </View>
  )
}

export default WheelEditPage
