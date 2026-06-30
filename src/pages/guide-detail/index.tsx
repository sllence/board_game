import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { useShare } from '@/hooks/useShare'
import { Lightbulb, BookOpen } from 'lucide-react-taro'
import type { FC } from 'react'

interface Step {
  title: string
  content: string
}

interface GuideDetail {
  id: number
  title: string
  desc: string
  cover_icon: string
  cover_bg: string
  steps: Step[]
  tips: string[]
}

const GuideDetailPage: FC = () => {
  useShare('攻略详情')
  const [guide, setGuide] = useState<GuideDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const instance = Taro.getCurrentInstance()
    const id = instance?.router?.params?.id
    if (!id) return
    fetchDetail(Number(id))
  }, [])

  const fetchDetail = async (id: number) => {
    setLoading(true)
    try {
      const res = await Network.request({ url: `/api/guides/${id}` })
      console.log('[GuideDetailPage] fetchDetail response:', res.data)
      setGuide(res.data?.data || null)
    } catch (err) {
      console.error('[GuideDetailPage] fetchDetail error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View className="flex items-center justify-center min-h-screen bg-background">
        <Text className="block text-gray-400 text-sm">加载中...</Text>
      </View>
    )
  }

  if (!guide) {
    return (
      <View className="flex items-center justify-center min-h-screen bg-background">
        <Text className="block text-gray-400 text-sm">未找到攻略信息</Text>
      </View>
    )
  }

  const steps: Step[] = Array.isArray(guide.steps) ? guide.steps : []
  const tips: string[] = Array.isArray(guide.tips) ? guide.tips : []

  return (
    <View className="flex flex-col min-h-screen bg-background">
      {/* 头部 */}
      <View className="px-5 pt-12 pb-6 bg-white">
        <View className="flex flex-row items-center gap-3">
          <View
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: guide.cover_bg || '#f3f4f6' }}
          >
            <BookOpen size={20} color="#4F46E5" />
          </View>
          <View className="flex-1">
            <Text className="block text-xl font-bold text-foreground">{guide.title}</Text>
            <Text className="block text-sm text-gray-400 mt-1">{guide.desc}</Text>
          </View>
        </View>
      </View>

      {/* 步骤 */}
      <View className="px-4 mt-4">
        <View className="flex flex-row items-center gap-2 mb-3">
          <View className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <BookOpen size={14} color="#fff" />
          </View>
          <Text className="block text-base font-semibold text-foreground">攻略步骤</Text>
        </View>
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <Accordion type="multiple" defaultValue={steps.map((_, i) => `step-${i}`)}>
              {steps.map((step, idx) => (
                <AccordionItem key={idx} value={`step-${idx}`}>
                  <AccordionTrigger>
                    <View className="flex flex-row items-center gap-2">
                      <View className="w-5 h-5 rounded flex items-center justify-center bg-indigo-100">
                        <Text className="text-xs font-bold text-indigo-600">{idx + 1}</Text>
                      </View>
                      <Text className="text-sm font-medium text-foreground">{step.title}</Text>
                    </View>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Text className="block text-sm text-gray-500 leading-relaxed whitespace-pre-line pl-7">
                      {step.content}
                    </Text>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </View>

      {/* 提示 */}
      {tips.length > 0 && (
        <View className="px-4 mt-5">
          <View className="flex flex-row items-center gap-2 mb-3">
            <View className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              <Lightbulb size={14} color="#fff" />
            </View>
            <Text className="block text-base font-semibold text-foreground">提示</Text>
          </View>
          <View className="flex flex-col gap-2">
            {tips.map((tip, idx) => (
              <View key={idx} className="bg-amber-50 rounded-xl px-4 py-3 flex flex-row gap-3">
                <View className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0 mt-1">
                  <Text className="text-xs text-white font-bold">{idx + 1}</Text>
                </View>
                <Text className="block text-sm text-amber-900 flex-1">{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View className="h-8" />
    </View>
  )
}

export default GuideDetailPage
