import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Users, Clock, Star, BookOpen, Lightbulb, Play, Heart, Volume2 } from 'lucide-react-taro'
import type { FC } from 'react'

interface Section {
  title: string
  content: string
}

interface BoardGameDetail {
  id: number
  name: string
  type: string
  min_players: number
  max_players: number
  duration: number
  difficulty: string
  icon_bg: string
  icon_color: string
  hero_bg: string
  intro: string
  sections: Section[]
  tips: string[]
  scoring_config: Record<string, unknown>
}

interface Guide {
  id: number
  title: string
  desc: string
  cover_icon: string
  cover_bg: string
}

const DIFFICULTY_MAP: Record<string, { label: string; color: string }> = {
  easy: { label: '简单', color: '#10b981' },
  medium: { label: '中等', color: '#f59e0b' },
  hard: { label: '困难', color: '#ef4444' },
}

const TYPE_MAP: Record<string, string> = {
  strategy: '策略',
  social: '社交',
  party: '聚会',
}

const RuleDetailPage: FC = () => {
  const [game, setGame] = useState<BoardGameDetail | null>(null)
  const [guides, setGuides] = useState<Guide[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const instance = Taro.getCurrentInstance()
    const id = instance?.router?.params?.id
    if (!id) return
    fetchDetail(Number(id))
    fetchGuides(Number(id))
  }, [])

  const fetchDetail = async (id: number) => {
    setLoading(true)
    try {
      const res = await Network.request({ url: `/api/games/${id}` })
      console.log('[RuleDetailPage] fetchDetail response:', res.data)
      setGame(res.data?.data || null)
    } catch (err) {
      console.error('[RuleDetailPage] fetchDetail error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchGuides = async (gameId: number) => {
    try {
      const res = await Network.request({ url: `/api/guides?gameId=${gameId}` })
      console.log('[RuleDetailPage] fetchGuides response:', res.data)
      setGuides(res.data?.data || [])
    } catch (err) {
      console.error('[RuleDetailPage] fetchGuides error:', err)
    }
  }

  const startSession = () => {
    if (!game) return
    Taro.navigateTo({ url: `/pages/navigator/index?gameId=${game.id}` })
  }

  const goToGuide = (guideId: number) => {
    Taro.navigateTo({ url: `/pages/guide-detail/index?id=${guideId}` })
  }

  if (loading) {
    return (
      <View className="flex items-center justify-center min-h-screen bg-background">
        <Text className="block text-muted-foreground text-sm">加载中...</Text>
      </View>
    )
  }

  if (!game) {
    return (
      <View className="flex items-center justify-center min-h-screen bg-background">
        <Text className="block text-muted-foreground text-sm">未找到桌游信息</Text>
      </View>
    )
  }

  const sections: Section[] = Array.isArray(game.sections) ? game.sections : []
  const tips: string[] = Array.isArray(game.tips) ? game.tips : []

  return (
    <View className="flex flex-col min-h-screen bg-background">
      {/* Hero 头部 */}
      <View
        className="px-5 pt-12 pb-6"
        style={{ background: game.hero_bg || 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
      >
        <Text className="block text-2xl font-bold text-white">{game.name}</Text>
        <Text className="block text-sm text-white text-opacity-80 mt-1">{TYPE_MAP[game.type] || game.type}</Text>
        <View className="flex flex-row items-center gap-4 mt-3">
          <View className="flex flex-row items-center gap-1">
            <Users size={14} color="rgba(255,255,255,0.8)" />
            <Text className="text-xs text-white text-opacity-80">{game.min_players}-{game.max_players}人</Text>
          </View>
          <View className="flex flex-row items-center gap-1">
            <Clock size={14} color="rgba(255,255,255,0.8)" />
            <Text className="text-xs text-white text-opacity-80">{game.duration}分钟</Text>
          </View>
          <View className="flex flex-row items-center gap-1">
            <Star size={14} color="rgba(255,255,255,0.8)" />
            <Text className="text-xs text-white text-opacity-80">{DIFFICULTY_MAP[game.difficulty]?.label || game.difficulty}</Text>
          </View>
        </View>
      </View>

      {/* 简介 */}
      <View className="px-4 -mt-3">
        <Card>
          <CardContent className="p-4">
            <Text className="block text-sm text-foreground leading-relaxed">{game.intro}</Text>
          </CardContent>
        </Card>
      </View>

      {/* 规则章节 */}
      <View className="px-4 mt-4">
        <View className="flex flex-row items-center gap-2 mb-3">
          <BookOpen size={18} color="#1a1a2e" />
          <Text className="block text-base font-semibold text-foreground">游戏规则</Text>
        </View>
        <Accordion type="multiple" defaultValue={sections.map((_, i) => `section-${i}`)}>
          {sections.map((section, idx) => (
            <AccordionItem key={idx} value={`section-${idx}`}>
              <AccordionTrigger>
                <Text className="text-sm font-medium">{section.title}</Text>
              </AccordionTrigger>
              <AccordionContent>
                <Text className="block text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {section.content}
                </Text>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </View>

      {/* 小贴士 */}
      {tips.length > 0 && (
        <View className="px-4 mt-4">
          <View className="flex flex-row items-center gap-2 mb-3">
            <Lightbulb size={18} color="#f59e0b" />
            <Text className="block text-base font-semibold text-foreground">小贴士</Text>
          </View>
          <View className="flex flex-col gap-2">
            {tips.map((tip, idx) => (
              <Card key={idx}>
                <CardContent className="p-3 flex flex-row gap-2">
                  <Text className="text-xs text-amber-500 flex-shrink-0">{idx + 1}.</Text>
                  <Text className="block text-sm text-foreground">{tip}</Text>
                </CardContent>
              </Card>
            ))}
          </View>
        </View>
      )}

      {/* 攻略列表 */}
      {guides.length > 0 && (
        <View className="px-4 mt-4">
          <View className="flex flex-row items-center gap-2 mb-3">
            <BookOpen size={18} color="#3b82f6" />
            <Text className="block text-base font-semibold text-foreground">相关攻略</Text>
          </View>
          <View className="flex flex-col gap-2">
            {guides.map((guide) => (
              <Card key={guide.id} className="cursor-pointer" onClick={() => goToGuide(guide.id)}>
                <CardContent className="p-3 flex flex-row items-center gap-3">
                  <View
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: guide.cover_bg || '#f3f4f6' }}
                  >
                    <BookOpen size={18} color="#6b7280" />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="block text-sm font-medium text-foreground truncate">{guide.title}</Text>
                    <Text className="block text-xs text-muted-foreground mt-1 truncate">{guide.desc}</Text>
                  </View>
                </CardContent>
              </Card>
            ))}
          </View>
        </View>
      )}

      {/* 底部操作栏 */}
      <View
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'row',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: '#fff',
          borderTop: '1px solid #e5e7eb',
          zIndex: 100,
        }}
      >
        <View className="flex flex-row items-center gap-3">
          <View className="flex flex-col items-center cursor-pointer">
            <Heart size={20} color="#9ca3af" />
            <Text className="text-xs text-muted-foreground mt-1">收藏</Text>
          </View>
          <View className="flex flex-col items-center cursor-pointer">
            <Volume2 size={20} color="#9ca3af" />
            <Text className="text-xs text-muted-foreground mt-1">朗读</Text>
          </View>
        </View>
        <View className="flex-1">
          <Button className="w-full" onClick={startSession}>
            <View className="flex flex-row items-center justify-center gap-2">
              <Play size={16} color="#fff" />
              <Text className="text-white font-medium">开始对局</Text>
            </View>
          </Button>
        </View>
      </View>

      {/* 底部留白 */}
      <View className="h-20" />
    </View>
  )
}

export default RuleDetailPage
