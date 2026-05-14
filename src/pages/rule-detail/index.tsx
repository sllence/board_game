import { View, Text, RichText, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { markdownToRichText } from '@/lib/markdown'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Users, Clock, Star, BookOpen, Lightbulb, Play, Heart, Volume2, ChevronRight } from 'lucide-react-taro'
import { requireLogin } from '@/utils/auth'
import type { FC } from 'react'

interface Section {
  title: string
  content: string
}

interface BoardGameDetail {
  id: number
  name: string
  type: string | string[]
  min_players: number
  max_players: number
  duration?: number
  min_duration?: number
  max_duration?: number
  difficulty: string
  icon_bg: string
  icon_color: string
  hero_bg: string
  intro: string
  sections?: Section[]
  tips?: string[]
  rules?: string
  image_url?: string
  scene?: string | string[]
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

const TYPE_META: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  strategy: { label: '策略', emoji: '♟️', color: '#4F46E5', bg: '#eef2ff' },
  puzzle: { label: '益智', emoji: '🧩', color: '#0EA5E9', bg: '#f0f9ff' },
  auction: { label: '拍卖', emoji: '🔨', color: '#F59E0B', bg: '#fffbeb' },
  roleplay: { label: '扮演', emoji: '🎭', color: '#8B5CF6', bg: '#faf5ff' },
  management: { label: '经营', emoji: '🏗️', color: '#10B981', bg: '#ecfdf5' },
  cooperative: { label: '合作', emoji: '🤝', color: '#06B6D4', bg: '#ecfeff' },
  versus: { label: '对抗', emoji: '⚔️', color: '#EF4444', bg: '#fef2f2' },
  social: { label: '社交', emoji: '💬', color: '#F59E0B', bg: '#fffbeb' },
  party: { label: '聚会', emoji: '🎉', color: '#8B5CF6', bg: '#faf5ff' },
}

const SCENE_META: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  gathering: { emoji: '🎉', label: '聚会', color: '#7c3aed', bg: '#f5f3ff' },
  teambuilding: { emoji: '🏢', label: '团建', color: '#0891b2', bg: '#ecfeff' },
  family: { emoji: '👨‍👩‍👧', label: '亲子', color: '#059669', bg: '#ecfdf5' },
  couple: { emoji: '💑', label: '情侣', color: '#e11d48', bg: '#fff1f2' },
  drinking: { emoji: '🍻', label: '酒局', color: '#d97706', bg: '#fffbeb' },
}

const RuleDetailPage: FC = () => {
  const [game, setGame] = useState<BoardGameDetail | null>(null)
  const [guides, setGuides] = useState<Guide[]>([])
  const [loading, setLoading] = useState(true)
  const [rulesExpanded, setRulesExpanded] = useState(false)

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
    requireLogin(() => {
      Taro.navigateTo({ url: `/pages/navigator/index?gameId=${game.id}` })
    })
  }

  const goToGuide = (guideId: number) => {
    Taro.navigateTo({ url: `/pages/guide-detail/index?id=${guideId}` })
  }

  // 转换 Markdown 为富文本格式，注入内联样式供 RichText 渲染
  const convertToRichText = (text: string) => markdownToRichText(text)

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
  const scenes: string[] = Array.isArray(game.scene) ? game.scene : game.scene ? [game.scene] : []
  const diffInfo = DIFFICULTY_MAP[game.difficulty] || { label: game.difficulty, color: '#6b7280', bg: '#f3f4f6' }
  
  // 显示时长：优先用新字段，否则用旧字段
  const displayDuration = game.min_duration && game.max_duration 
    ? `${game.min_duration}-${game.max_duration}`
    : game.duration ? String(game.duration) : '30-60'

  return (
    <View className="flex flex-col min-h-screen bg-[#f5f5f7]">
      {/* Hero 头部 */}
      <View
        className="px-5 pt-12 pb-8"
        style={{ background: game.hero_bg || 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
      >
        <Text className="block text-2xl font-bold text-white">{game.name}</Text>
        <View className="flex flex-row flex-wrap items-center gap-2 mt-3">
          {(Array.isArray(game.type) ? game.type : [game.type]).map((t) => {
            const meta = TYPE_META[t]
            return meta ? (
              <View key={t} className="rounded px-2 py-1" style={{ backgroundColor: meta.bg }}>
                <Text style={{ fontSize: 11, color: meta.color }}>{meta.emoji} {meta.label}</Text>
              </View>
            ) : null
          })}
          {scenes.map((s) => {
            const meta = SCENE_META[s]
            return meta ? (
              <View key={s} className="rounded px-2 py-1" style={{ backgroundColor: meta.bg }}>
                <Text style={{ fontSize: 11, color: meta.color }}>{meta.emoji} {meta.label}</Text>
              </View>
            ) : null
          })}
        </View>
        <View className="flex flex-row items-center gap-5 mt-4">
          <View className="flex flex-row items-center gap-1">
            <Users size={14} color="rgba(255,255,255,0.9)" />
            <Text className="text-sm text-white font-medium">{game.min_players}-{game.max_players}人</Text>
          </View>
          <View className="flex flex-row items-center gap-1">
            <Clock size={14} color="rgba(255,255,255,0.9)" />
            <Text className="text-sm text-white font-medium">{displayDuration}分钟</Text>
          </View>
          <View className="flex flex-row items-center gap-1">
            <Star size={14} color="rgba(255,255,255,0.9)" />
            <Text className="text-sm text-white font-medium">{diffInfo.label}难度</Text>
          </View>
        </View>
      </View>

      {game.image_url && (
        <View className="px-4 -mt-4">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-0">
              <Image src={game.image_url} className="w-full h-48" mode="aspectFill" onError={(e) => { e.stopPropagation() }} />
            </CardContent>
          </Card>
        </View>
      )}

      {/* 简介卡片 */}
      <View className="px-4 -mt-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <Text className="block text-sm text-[#374151] leading-relaxed">{game.intro}</Text>
          </CardContent>
        </Card>
      </View>

      {/* 游戏规则 - 新的统一字段 */}
      {game.rules && (
        <View className="px-4 mt-5">
          <View
            className="flex flex-row items-center justify-between mb-3"
            onClick={() => setRulesExpanded(v => !v)}
          >
            <View className="flex flex-row items-center gap-2">
              <View className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                <BookOpen size={14} color="#fff" />
              </View>
              <Text className="block text-base font-semibold text-[#1e1b4b]">游戏规则</Text>
            </View>
            <ChevronRight size={16} color="#9ca3af" style={{ transform: rulesExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }} />
          </View>
          {rulesExpanded && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <RichText nodes={convertToRichText(game.rules)} />
              </CardContent>
            </Card>
          )}
        </View>
      )}

      {/* 旧的规则章节 - 保持向后兼容 */}
      {!game.rules && sections.length > 0 && (
        <View className="px-4 mt-5">
          <View
            className="flex flex-row items-center justify-between mb-3"
            onClick={() => setRulesExpanded(v => !v)}
          >
            <View className="flex flex-row items-center gap-2">
              <View className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                <BookOpen size={14} color="#fff" />
              </View>
              <Text className="block text-base font-semibold text-[#1e1b4b]">游戏规则</Text>
            </View>
            <ChevronRight size={16} color="#9ca3af" style={{ transform: rulesExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }} />
          </View>
          {rulesExpanded && (
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
          )}
        </View>
      )}

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
