import { View, Text, RichText, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect, useMemo } from 'react'
import { markdownToRichText } from '@/lib/markdown'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Clock, Star, BookOpen, Lightbulb, Play, ChevronRight, ChevronDown } from 'lucide-react-taro'
import { requireLogin } from '@/utils/auth'
import { useShare } from '@/hooks/useShare'
import { TYPE_META, SCENE_META, DIFFICULTY_META } from '@/constants/game'
import type { FC } from 'react'

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

interface GameRule {
  id: number
  game_id: number
  title: string
  rule_type: 'markdown' | 'images'
  content: string
  image_urls: string[]
  sort_order: number
  status?: string
}

/** 图片轮播组件：左右滑动 + 页标指示器 */
const ImageCarousel: FC<{
  images: string[]
  onPreview: (url: string) => void
}> = ({ images, onPreview }) => {
  const [currentPage, setCurrentPage] = useState(0)
  const [pageWidth, setPageWidth] = useState(375)

  useEffect(() => {
    Taro.createSelectorQuery()
      .select('.image-carousel-scroll')
      .boundingClientRect((rect) => {
        if (rect && !Array.isArray(rect)) setPageWidth(rect.width)
      })
      .exec()
  }, [])

  const handleScroll = (e: any) => {
    const left = e.detail?.scrollLeft ?? 0
    const page = Math.round(left / pageWidth)
    if (page !== currentPage && page >= 0 && page < images.length) {
      setCurrentPage(page)
    }
  }

  return (
    <View className="border-t border-gray-100 pt-3">
      <View className="relative overflow-hidden rounded-xl">
        <ScrollView
          scrollX
          showScrollbar={false}
          onScroll={handleScroll}
          className="w-full image-carousel-scroll"
          style={{ height: '384px' }}
        >
          <View className="flex flex-row gap-0" style={{ height: '384px' }}>
            {images.map((url, idx) => (
              <View
                key={idx}
                className="flex items-center justify-center"
                style={{ flex: '0 0 100%', height: '384px' }}
                onClick={() => onPreview(url)}
              >
                <Image
                  src={url}
                  className="w-full h-full"
                  style={{ objectFit: 'contain' }}
                  mode="aspectFit"
                />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* 页标指示器 */}
      <View className="flex flex-row items-center justify-center mt-3 gap-2">
        {images.map((_, idx) => (
          <View
            key={idx}
            className={`rounded-full transition-all duration-200 ${idx === currentPage ? 'w-5 h-1 bg-primary' : 'w-1 h-1 bg-gray-300'}`}
          />
        ))}
      </View>
      <Text className="block text-xs text-gray-400 mt-2 text-center">
        {currentPage + 1}/{images.length}（点击可预览大图）
      </Text>
    </View>
  )
}

const RuleDetailPage: FC = () => {
  useShare('规则详情')
  const [game, setGame] = useState<BoardGameDetail | null>(null)
  const [guides, setGuides] = useState<Guide[]>([])
  const [rules, setRules] = useState<GameRule[]>([])
  const [loading, setLoading] = useState(true)
  const [rulesExpanded, setRulesExpanded] = useState(false)
  const [expandedRuleIds, setExpandedRuleIds] = useState<number[]>([])
  const activeRules = useMemo(() => rules.filter(r => r.status !== 'converting' && r.status !== 'failed'), [rules])

  const toggleRule = (ruleId: number) => {
    setExpandedRuleIds(prev =>
      prev.includes(ruleId) ? prev.filter(id => id !== ruleId) : [...prev, ruleId]
    )
  }

  useEffect(() => {
    const instance = Taro.getCurrentInstance()
    const id = instance?.router?.params?.id
    if (!id) return
    fetchDetail(Number(id))
    fetchGuides(Number(id))
    fetchRules(Number(id))
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

  const fetchRules = async (gameId: number) => {
    try {
      const res = await Network.request({ url: `/api/game-rules?game_id=${gameId}` })
      console.log('[RuleDetailPage] fetchRules response:', res.data)
      setRules(res.data?.data || [])
    } catch (err) {
      console.error('[RuleDetailPage] fetchRules error:', err)
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
      <View className="flex items-center justify-center min-h-screen bg-background">
        <Text className="block text-gray-400 text-sm">加载中...</Text>
      </View>
    )
  }

  if (!game) {
    return (
      <View className="flex items-center justify-center min-h-screen bg-background">
        <Text className="block text-gray-400 text-sm">未找到桌游信息</Text>
      </View>
    )
  }

  const tips: string[] = Array.isArray(game.tips) ? game.tips : []
  const scenes: string[] = Array.isArray(game.scene) ? game.scene : game.scene ? [game.scene] : []
  const diffInfo = DIFFICULTY_META[game.difficulty] || { label: game.difficulty, color: '#6b7280', bg: '#f3f4f6', emoji: '🎲' }
  
  // 显示时长：优先用新字段，否则用旧字段
  const displayDuration = game.min_duration && game.max_duration 
    ? `${game.min_duration}-${game.max_duration}`
    : game.duration ? String(game.duration) : '30-60'

  return (
    <View className="flex flex-col min-h-screen bg-background">
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
          <Card className="shadow-lg">
            <CardContent className="p-0">
              <Image src={game.image_url} className="w-full h-48" mode="aspectFill" onError={(e) => { e.stopPropagation() }} />
            </CardContent>
          </Card>
        </View>
      )}

      {/* 简介卡片 */}
      <View className="px-4 -mt-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <Text className="block text-sm text-[#374151] leading-relaxed">{game.intro}</Text>
          </CardContent>
        </Card>
      </View>

      {/* 游戏规则 - 多规则折叠展示 */}
      {(activeRules.length > 0 || game.rules) && (
        <View className="px-4 mt-5">
          <View className="flex flex-row items-center gap-2 mb-3">
            <View className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <BookOpen size={14} color="#fff" />
            </View>
            <Text className="block text-base font-semibold text-foreground">游戏规则</Text>
            {activeRules.length > 0 && (
              <Text className="block text-xs text-gray-400 ml-1">{activeRules.length}条</Text>
            )}
          </View>

          {activeRules.length > 0 ? (
            <View className="flex flex-col gap-2">
              {activeRules.map((rule) => {
                const isExpanded = expandedRuleIds.includes(rule.id)
                return (
                  <Card key={rule.id} className="shadow-sm">
                    <View
                      className="flex flex-row items-center justify-between px-4 py-3 cursor-pointer"
                      onClick={() => toggleRule(rule.id)}
                    >
                      <View className="flex flex-row items-center gap-2 flex-1 min-w-0">
                        <Text className="block text-sm font-medium text-foreground truncate">{rule.title}</Text>
                        <View className={`rounded px-2 py-1 flex-shrink-0 ${rule.rule_type === 'images' ? 'bg-green-50' : 'bg-blue-50'}`}>
                          <Text className={`text-[10px] ${rule.rule_type === 'images' ? 'text-green-600' : 'text-blue-600'}`}>
                            {rule.rule_type === 'markdown' ? '文本' : '图册'}
                          </Text>
                        </View>
                      </View>
                      <ChevronDown
                        size={16}
                        color="#9ca3af"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0, marginLeft: 8 }}
                      />
                    </View>
                    {isExpanded && (
                      <CardContent className="px-4 pb-4 pt-0">
                        {rule.rule_type === 'markdown' && rule.content && (
                          <View className="border-t border-gray-100 pt-3">
                            <RichText nodes={convertToRichText(rule.content)} />
                          </View>
                        )}
                        {rule.rule_type === 'images' && rule.image_urls && rule.image_urls.length > 0 && (
                          <ImageCarousel
                            images={rule.image_urls}
                            onPreview={(url) => Taro.previewImage({ urls: rule.image_urls, current: url })}
                          />
                        )}
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </View>
          ) : game.rules ? (
            /* 兼容旧数据：单条 Markdown 规则回退展示 */
            <View>
              <View
                className="flex flex-row items-center justify-between mb-3"
                onClick={() => setRulesExpanded(v => !v)}
              >
                <Text className="block text-sm font-medium text-foreground">完整规则</Text>
                <ChevronRight size={16} color="#9ca3af" style={{ transform: rulesExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }} />
              </View>
              {rulesExpanded && (
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <RichText nodes={convertToRichText(game.rules)} />
                  </CardContent>
                </Card>
              )}
            </View>
          ) : null}
        </View>
      )}

      {tips.length > 0 && (
        <View className="px-4 mt-5">
          <View className="flex flex-row items-center gap-2 mb-3">
            <View className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              <Lightbulb size={14} color="#fff" />
            </View>
            <Text className="block text-base font-semibold text-foreground">小贴士</Text>
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
            <Text className="block text-base font-semibold text-foreground">相关攻略</Text>
          </View>
          <Card className="shadow-sm">
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
                    <Text className="block text-sm font-medium text-foreground truncate">{guide.title}</Text>
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
        {/* 收藏和朗读功能暂时隐藏 */}
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
