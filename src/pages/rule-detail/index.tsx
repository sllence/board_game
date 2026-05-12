import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Users, Clock, Star, BookOpen, Lightbulb, Play, Heart, Volume2, ChevronRight } from 'lucide-react-taro'
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

const DIFFICULTY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  easy: { label: '简单', color: '#059669', bg: '#ecfdf5' },
  medium: { label: '中等', color: '#d97706', bg: '#fffbeb' },
  hard: { label: '困难', color: '#dc2626', bg: '#fef2f2' },
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
      <View className="flex items-center justify-center min-h-screen bg-[#f5f5f7]">
        <Text className="block text-gray-400 text-sm">加载中...</Text>
      </View>
    )
  }

  if (!game) {
    return (
      <View className="flex items-center justify-center min-h-screen bg-[#f5f5f7]">
        <Text className="block text-gray-400 text-sm">未找到桌游信息</Text>
      </View>
    )
  }

  const sections: Section[] = Array.isArray(game.sections) ? game.sections : []
  const tips: string[] = Array.isArray(game.tips) ? game.tips : []
  const diffInfo = DIFFICULTY_MAP[game.difficulty] || { label: game.difficulty, color: '#6b7280', bg: '#f3f4f6' }

  return (
    <View className="flex flex-col min-h-screen bg-[#f5f5f7]">
      {/* Hero 头部 */}
      <View
        className="px-5 pt-12 pb-8"
        style={{ background: game.hero_bg || 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
      >
        <Text className="block text-2xl font-bold text-white">{game.name}</Text>
        <View className="flex flex-row items-center gap-2 mt-2">
          <View className="rounded-full px-3 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <Text className="text-xs text-white font-medium">{TYPE_MAP[game.type] || game.type}</Text>
          </View>
          <View className="rounded-full px-3 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <Text className="text-xs text-white font-medium" style={{ color: diffInfo.color }}>{diffInfo.label}</Text>
          </View>
        </View>
        <View className="flex flex-row items-center gap-5 mt-4">
          <View className="flex flex-row items-center gap-1">
            <Users size={14} color="rgba(255,255,255,0.9)" />
            <Text className="text-sm text-white font-medium">{game.min_players}-{game.max_players}人</Text>
          </View>
          <View className="flex flex-row items-center gap-1">
            <Clock size={14} color="rgba(255,255,255,0.9)" />
            <Text className="text-sm text-white font-medium">{game.duration}分钟</Text>
          </View>
        </View>
      </View>

      {/* 简介卡片 */}
      <View className="px-4 -mt-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <Text className="block text-sm text-[#374151] leading-relaxed">{game.intro}</Text>
          </CardContent>
        </Card>
      </View>

      {/* 规则章节 */}
      <View className="px-4 mt-5">
        <View className="flex flex-row items-center gap-2 mb-3">
          <View className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <BookOpen size={14} color="#fff" />
          </View>
          <Text className="block text-base font-semibold text-[#1e1b4b]">游戏规则</Text>
        </View>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Accordion type="multiple" defaultValue={sections.map((_, i) => `section-${i}`)}>
              {sections.map((section, idx) => (
                <AccordionItem key={idx} value={`section-${idx}`}>
                  <AccordionTrigger>
                    <View className="flex flex-row items-center gap-2">
                      <View className="w-5 h-5 rounded flex items-center justify-center bg-indigo-100">
                        <Text className="text-xs font-bold text-indigo-600">{idx + 1}</Text>
                      </View>
                      <Text className="text-sm font-medium text-[#1e1b4b]">{section.title}</Text>
                    </View>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Text className="block text-sm text-gray-500 leading-relaxed whitespace-pre-line pl-7">
                      {section.content}
                    </Text>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </View>

      {/* 小贴士 */}
      {tips.length > 0 && (
        <View className="px-4 mt-5">
          <View className="flex flex-row items-center gap-2 mb-3">
            <View className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              <Lightbulb size={14} color="#fff" />
            </View>
            <Text className="block text-base font-semibold text-[#1e1b4b]">小贴士</Text>
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

      {/* 攻略列表 */}
      {guides.length > 0 && (
        <View className="px-4 mt-5">
          <View className="flex flex-row items-center gap-2 mb-3">
            <View className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
              <Star size={14} color="#fff" />
            </View>
            <Text className="block text-base font-semibold text-[#1e1b4b]">相关攻略</Text>
          </View>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {guides.map((guide, idx) => (
                <View
                  key={guide.id}
                  className="flex flex-row items-center px-4 py-3 cursor-pointer"
                  style={{ borderBottomWidth: idx < guides.length - 1 ? 1 : 0, borderBottomColor: '#f3f4f6' }}
                  onClick={() => goToGuide(guide.id)}
                >
                  <View
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mr-3"
                    style={{ backgroundColor: guide.cover_bg || '#f3f4f6' }}
                  >
                    <BookOpen size={18} color="#6b7280" />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="block text-sm font-medium text-[#1e1b4b] truncate">{guide.title}</Text>
                    <Text className="block text-xs text-gray-400 mt-1 truncate">{guide.desc}</Text>
                  </View>
                  <ChevronRight size={16} color="#d1d5db" />
                </View>
              ))}
            </CardContent>
          </Card>
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
          borderTop: '1px solid #f3f4f6',
          zIndex: 100,
        }}
      >
        <View className="flex flex-row items-center gap-4">
          <View className="flex flex-col items-center cursor-pointer" onClick={() => Taro.showToast({ title: '功能开发中', icon: 'none' })}>
            <Heart size={20} color="#d1d5db" />
            <Text className="text-xs text-gray-300 mt-1">收藏</Text>
          </View>
          <View className="flex flex-col items-center cursor-pointer" onClick={() => Taro.showToast({ title: '功能开发中', icon: 'none' })}>
            <Volume2 size={20} color="#d1d5db" />
            <Text className="text-xs text-gray-300 mt-1">朗读</Text>
          </View>
        </View>
        <View className="flex-1">
          <Button className="w-full rounded-xl" onClick={startSession} style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
            <View className="flex flex-row items-center justify-center gap-2">
              <Play size={16} color="#fff" />
              <Text className="text-white font-medium">开始对局</Text>
            </View>
          </Button>
        </View>
      </View>

      {/* 底部留白 */}
      <View className="h-24" />
    </View>
  )
}

export default RuleDetailPage
