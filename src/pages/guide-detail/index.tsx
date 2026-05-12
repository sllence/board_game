import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Lightbulb, ArrowLeft } from 'lucide-react-taro'
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
        <Text className="block text-muted-foreground text-sm">加载中...</Text>
      </View>
    )
  }

  if (!guide) {
    return (
      <View className="flex items-center justify-center min-h-screen bg-background">
        <Text className="block text-muted-foreground text-sm">未找到攻略信息</Text>
      </View>
    )
  }

  const steps: Step[] = Array.isArray(guide.steps) ? guide.steps : []
  const tips: string[] = Array.isArray(guide.tips) ? guide.tips : []

  return (
    <View className="flex flex-col min-h-screen bg-background">
      {/* 头部 */}
      <View className="px-5 pt-12 pb-6 bg-muted bg-opacity-50">
        <Text className="block text-xl font-bold text-foreground">{guide.title}</Text>
        <Text className="block text-sm text-muted-foreground mt-1">{guide.desc}</Text>
      </View>

      {/* 步骤 */}
      <View className="px-4 mt-4">
        <View className="flex flex-row items-center gap-2 mb-3">
          <ArrowLeft size={18} color="#1a1a2e" />
          <Text className="block text-base font-semibold text-foreground">攻略步骤</Text>
        </View>
        <Accordion type="multiple" defaultValue={steps.map((_, i) => `step-${i}`)}>
          {steps.map((step, idx) => (
            <AccordionItem key={idx} value={`step-${idx}`}>
              <AccordionTrigger>
                <View className="flex flex-row items-center gap-2">
                  <Badge variant="secondary">
                    <Text className="text-xs">{idx + 1}</Text>
                  </Badge>
                  <Text className="text-sm font-medium">{step.title}</Text>
                </View>
              </AccordionTrigger>
              <AccordionContent>
                <Text className="block text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {step.content}
                </Text>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </View>

      {/* 提示 */}
      {tips.length > 0 && (
        <View className="px-4 mt-4">
          <View className="flex flex-row items-center gap-2 mb-3">
            <Lightbulb size={18} color="#f59e0b" />
            <Text className="block text-base font-semibold text-foreground">提示</Text>
          </View>
          <View className="flex flex-col gap-2">
            {tips.map((tip, idx) => (
              <Card key={idx}>
                <CardContent className="p-3">
                  <Text className="block text-sm text-foreground">{tip}</Text>
                </CardContent>
              </Card>
            ))}
          </View>
        </View>
      )}

      <View className="h-8" />
    </View>
  )
}

export default GuideDetailPage
