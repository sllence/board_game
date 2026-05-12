import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Network } from '@/network'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Search, Users, Clock, Star, ChessKing, ChevronDown } from 'lucide-react-taro'
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

// 筛选项配置
const FILTER_OPTIONS = {
  type: [
    { key: '', label: '类型' },
    { key: 'strategy', label: '策略' },
    { key: 'social', label: '社交' },
    { key: 'party', label: '聚会' },
  ],
  scene: [
    { key: '', label: '场景' },
    { key: 'party', label: '派对' },
  ],
  players: [
    { key: '', label: '人数' },
    { key: '2', label: '2人' },
    { key: '3', label: '3人' },
    { key: '4', label: '4人' },
    { key: '5', label: '5人' },
    { key: '6', label: '6人+' },
  ],
  duration: [
    { key: '', label: '时长' },
    { key: '15', label: '15分钟内' },
    { key: '30', label: '30分钟内' },
    { key: '45', label: '45分钟内' },
    { key: '60', label: '60分钟内' },
  ],
  difficulty: [
    { key: '', label: '难度' },
    { key: 'easy', label: '简单' },
    { key: 'medium', label: '中等' },
    { key: 'hard', label: '困难' },
  ],
} as const

type FilterKey = keyof typeof FILTER_OPTIONS

const GamesPage: FC = () => {
  const [games, setGames] = useState<BoardGame[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null)
  const [filters, setFilters] = useState({
    type: '',
    scene: '',
    players: '',
    duration: '',
    difficulty: '',
  })

  const fetchGames = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filters.type) params.type = filters.type
      if (filters.scene) params.scene = filters.scene
      if (filters.difficulty) params.difficulty = filters.difficulty
      if (filters.duration) params.duration = filters.duration
      if (filters.players) {
        params.min_players = filters.players
      }
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
  }, [filters])

  const handleSearch = () => {
    fetchGames()
  }

  const handleFilterSelect = (filterKey: FilterKey, value: string) => {
    setFilters(prev => ({ ...prev, [filterKey]: value }))
    setActiveFilter(null)
  }

  const getFilterLabel = (filterKey: FilterKey): string => {
    const currentValue = filters[filterKey]
    if (!currentValue) {
      return FILTER_OPTIONS[filterKey][0].label
    }
    const option = FILTER_OPTIONS[filterKey].find(opt => opt.key === currentValue)
    return option ? option.label : FILTER_OPTIONS[filterKey][0].label
  }

  const isFilterActive = (filterKey: FilterKey): boolean => {
    return filters[filterKey] !== ''
  }

  const goToDetail = (id: number) => {
    Taro.navigateTo({ url: `/pages/rule-detail/index?id=${id}` })
  }

  const filterKeys: FilterKey[] = ['type', 'scene', 'players', 'duration', 'difficulty']

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

      {/* 筛选栏 - 下拉选择器 */}
      <View className="px-4 -mt-4 mb-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-row items-center gap-2 p-3">
            {filterKeys.map((filterKey) => (
              <View
                key={filterKey}
                className="flex-1 relative"
                onClick={() => {
                  setActiveFilter(activeFilter === filterKey ? null : filterKey)
                }}
              >
                <View
                  className="flex flex-row items-center justify-center gap-1 rounded-full py-2 px-1"
                  style={{
                    backgroundColor: isFilterActive(filterKey) ? '#eef2ff' : '#f9fafb',
                    borderWidth: 1,
                    borderColor: activeFilter === filterKey ? '#4F46E5' : (isFilterActive(filterKey) ? '#4F46E5' : '#e5e7eb'),
                    borderStyle: 'solid',
                  }}
                >
                  <Text className="text-xs" style={{ color: isFilterActive(filterKey) ? '#4F46E5' : '#6b7280' }}>
                    {getFilterLabel(filterKey)}
                  </Text>
                  <ChevronDown size={12} color={isFilterActive(filterKey) ? '#4F46E5' : '#9ca3af'} />
                </View>
                {/* 下拉选项 */}
                {activeFilter === filterKey && (
                  <View
                    className="absolute left-0 right-0 top-full mt-1 rounded-xl shadow-lg z-50 overflow-hidden"
                    style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'solid' }}
                  >
                    {FILTER_OPTIONS[filterKey].map((option) => (
                      <View
                        key={option.key}
                        className="py-2 px-3"
                        style={{
                          backgroundColor: filters[filterKey] === option.key ? '#eef2ff' : '#fff',
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleFilterSelect(filterKey, option.key)
                        }}
                      >
                        <Text className="text-xs" style={{ color: filters[filterKey] === option.key ? '#4F46E5' : '#374151' }}>
                          {option.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </CardContent>
        </Card>
      </View>

      {/* 点击空白关闭下拉 */}
      {activeFilter && (
        <View
          className="fixed inset-0 z-40"
          style={{ backgroundColor: 'transparent' }}
          onClick={() => setActiveFilter(null)}
        />
      )}

      {/* 游戏列表 */}
      <View className="flex-1 px-4 pb-20">
        {loading ? (
          <View className="flex items-center justify-center py-20">
            <Text className="block text-gray-400 text-sm">加载中...</Text>
          </View>
        ) : games.length === 0 ? (
          <View className="flex items-center justify-center py-20">
            <Text className="block text-gray-400 text-sm">暂无符合条件的桌游</Text>
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
