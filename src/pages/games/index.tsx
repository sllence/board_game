import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Network } from '@/network'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Search, Users, Clock, Star, ChessKing } from 'lucide-react-taro'
import type { FC } from 'react'

interface BoardGame {
  id: number
  name: string
  type: string
  scene: string
  min_players: number
  max_players: number
  duration: number
  difficulty: string
  icon_key: string
  icon_bg: string
  icon_color: string
  hero_bg: string
  intro: string
}

const TYPE_TABS = [
  { key: '', label: '全部' },
  { key: 'strategy', label: '策略' },
  { key: 'social', label: '社交' },
  { key: 'party', label: '聚会' },
]

const TYPE_GRADIENT: Record<string, string> = {
  strategy: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
  social: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)',
  party: 'linear-gradient(135deg, #F97316 0%, #EF4444 100%)',
}

const DIFFICULTY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  easy: { label: '简单', color: '#059669', bg: '#ecfdf5' },
  medium: { label: '中等', color: '#d97706', bg: '#fffbeb' },
  hard: { label: '困难', color: '#dc2626', bg: '#fef2f2' },
}

const GamesPage: FC = () => {
  const [games, setGames] = useState<BoardGame[]>([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState('')
  const [keyword, setKeyword] = useState('')

  const fetchGames = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (activeType) params.type = activeType
      if (keyword) params.keyword = keyword
      const queryStr = new URLSearchParams(params).toString()
      const url = `/api/games${queryStr ? '?' + queryStr : ''}`
      console.log('[GamesPage] fetchGames url:', url)
      const res = await Network.request({ url })
      console.log('[GamesPage] fetchGames response:', res.data)
      setGames(res.data?.data || [])
    } catch (err) {
      console.error('[GamesPage] fetchGames error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGames()
  }, [activeType])

  const handleSearch = () => {
    fetchGames()
  }

  const goToDetail = (id: number) => {
    Taro.navigateTo({ url: `/pages/rule-detail/index?id=${id}` })
  }

  return (
    <View className="flex flex-col min-h-screen bg-[#f5f5f7]">
      {/* 顶部标题区 */}
      <View className="px-5 pt-12 pb-4" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
        <View className="flex flex-row items-center gap-2 mb-1">
          <ChessKing size={20} color="#fbbf24" />
          <Text className="text-sm font-medium text-yellow-300">桌游馆</Text>
        </View>
        <Text className="block text-xl font-bold text-white mb-3">发现好玩的桌游</Text>
        {/* 搜索栏 */}
        <View className="relative">
          <View className="rounded-2xl pl-10 pr-4 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <Input
              className="w-full bg-transparent text-sm text-white placeholder-white placeholder-opacity-60"
              placeholder="搜索桌游名称..."
              placeholderClass="text-white text-opacity-60"
              value={keyword}
              onInput={(e) => setKeyword(e.detail.value)}
              onConfirm={handleSearch}
            />
          </View>
          <View className="absolute left-3 top-1/2 -translate-y-1/2">
            <Search size={16} color="rgba(255,255,255,0.6)" />
          </View>
        </View>
      </View>

      {/* 分类 Tab - 浮动 */}
      <View className="px-4 -mt-4 mb-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-row gap-2 p-3">
            {TYPE_TABS.map((tab) => (
              <Badge
                key={tab.key}
                variant={activeType === tab.key ? 'default' : 'secondary'}
                className="cursor-pointer"
                onClick={() => setActiveType(tab.key)}
              >
                <Text className="text-xs">{tab.label}</Text>
              </Badge>
            ))}
          </CardContent>
        </Card>
      </View>

      {/* 游戏列表 - 渐变卡片 */}
      <View className="flex-1 px-4 pb-20">
        {loading ? (
          <View className="flex items-center justify-center py-20">
            <Text className="block text-gray-400 text-sm">加载中...</Text>
          </View>
        ) : games.length === 0 ? (
          <View className="flex items-center justify-center py-20">
            <Text className="block text-gray-400 text-sm">暂无桌游数据</Text>
          </View>
        ) : (
          <View className="flex flex-col gap-3">
            {games.map((game) => (
              <View
                key={game.id}
                className="cursor-pointer rounded-2xl overflow-hidden shadow-sm"
                style={{ background: TYPE_GRADIENT[game.type] || TYPE_GRADIENT.strategy }}
                onClick={() => goToDetail(game.id)}
              >
                <View className="p-4">
                  <View className="flex flex-row items-center justify-between">
                    <View className="flex-1 min-w-0">
                      <Text className="block text-lg font-bold text-white">{game.name}</Text>
                      <Text className="block text-xs text-white text-opacity-80 mt-1 line-clamp-1">{game.intro}</Text>
                      <View className="flex flex-row items-center gap-2 mt-3">
                        <View className="rounded-full px-2 py-1 flex flex-row items-center gap-1" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                          <Users size={10} color="#fff" />
                          <Text className="text-xs text-white">{game.min_players}-{game.max_players}人</Text>
                        </View>
                        <View className="rounded-full px-2 py-1 flex flex-row items-center gap-1" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                          <Clock size={10} color="#fff" />
                          <Text className="text-xs text-white">{game.duration}min</Text>
                        </View>
                        <View className="rounded-full px-2 py-1 flex flex-row items-center gap-1" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                          <Star size={10} color="#fbbf24" />
                          <Text className="text-xs text-white">{DIFFICULTY_MAP[game.difficulty]?.label || game.difficulty}</Text>
                        </View>
                      </View>
                    </View>
                    <View className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ml-3" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                      <Text className="text-xl font-bold text-white">{game.name.charAt(0)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}

export default GamesPage
