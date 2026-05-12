import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Network } from '@/network'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Search, Users, Clock, Star } from 'lucide-react-taro'
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
  intro: string
}

const TYPE_TABS = [
  { key: '', label: '全部' },
  { key: 'strategy', label: '策略' },
  { key: 'social', label: '社交' },
  { key: 'party', label: '聚会' },
]

const DIFFICULTY_MAP: Record<string, { label: string; color: string }> = {
  easy: { label: '简单', color: '#10b981' },
  medium: { label: '中等', color: '#f59e0b' },
  hard: { label: '困难', color: '#ef4444' },
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
    <View className="flex flex-col min-h-screen bg-background">
      {/* 搜索栏 */}
      <View className="px-4 pt-3 pb-2">
        <View className="relative">
          <Input
            className="w-full bg-muted rounded-full pl-10 pr-4 py-2 text-sm"
            placeholder="搜索桌游名称..."
            value={keyword}
            onInput={(e) => setKeyword(e.detail.value)}
            onConfirm={handleSearch}
          />
          <View className="absolute left-3 top-1/2 -translate-y-1/2">
            <Search size={16} color="#9ca3af" />
          </View>
        </View>
      </View>

      {/* 分类 Tab */}
      <View className="flex flex-row gap-2 px-4 pb-3">
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
      </View>

      {/* 游戏列表 */}
      <View className="flex-1 px-4 pb-20">
        {loading ? (
          <View className="flex items-center justify-center py-20">
            <Text className="block text-muted-foreground text-sm">加载中...</Text>
          </View>
        ) : games.length === 0 ? (
          <View className="flex items-center justify-center py-20">
            <Text className="block text-muted-foreground text-sm">暂无桌游数据</Text>
          </View>
        ) : (
          <View className="flex flex-col gap-3">
            {games.map((game) => (
              <Card key={game.id} className="cursor-pointer" onClick={() => goToDetail(game.id)}>
                <CardContent className="flex flex-row items-center p-4 gap-4">
                  {/* 图标 */}
                  <View
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: game.icon_bg || '#e5e7eb' }}
                  >
                    <Text className="text-lg font-bold" style={{ color: game.icon_color || '#1f2937' }}>
                      {game.name.charAt(0)}
                    </Text>
                  </View>
                  {/* 信息 */}
                  <View className="flex-1 min-w-0">
                    <Text className="block text-base font-semibold text-foreground truncate">{game.name}</Text>
                    <Text className="block text-xs text-muted-foreground mt-1 line-clamp-1">{game.intro}</Text>
                    <View className="flex flex-row items-center gap-3 mt-2">
                      <View className="flex flex-row items-center gap-1">
                        <Users size={12} color="#9ca3af" />
                        <Text className="text-xs text-muted-foreground">{game.min_players}-{game.max_players}人</Text>
                      </View>
                      <View className="flex flex-row items-center gap-1">
                        <Clock size={12} color="#9ca3af" />
                        <Text className="text-xs text-muted-foreground">{game.duration}min</Text>
                      </View>
                      <View className="flex flex-row items-center gap-1">
                        <Star size={12} color={DIFFICULTY_MAP[game.difficulty]?.color || '#9ca3af'} />
                        <Text className="text-xs" style={{ color: DIFFICULTY_MAP[game.difficulty]?.color || '#9ca3af' }}>
                          {DIFFICULTY_MAP[game.difficulty]?.label || game.difficulty}
                        </Text>
                      </View>
                    </View>
                  </View>
                </CardContent>
              </Card>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}

export default GamesPage
