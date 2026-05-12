import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Network } from '@/network'
import { Input } from '@/components/ui/input'
import { Search, Users, Clock, ChevronDown, RotateCcw } from 'lucide-react-taro'
import type { FC } from 'react'

interface BoardGame {
  id: number
  name: string
  type: string[]
  scene: string[]
  min_players: number
  max_players: number
  duration: number
  difficulty: string
  icon_key: string
  icon_bg: string
  icon_color: string
  intro: string
}

// 每种类型对应一个emoji和颜色
const TYPE_META: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  strategy: { label: '策略', emoji: '♟️', color: '#4F46E5', bg: '#eef2ff' },
  puzzle: { label: '益智', emoji: '🧩', color: '#0EA5E9', bg: '#f0f9ff' },
  auction: { label: '拍卖', emoji: '🔨', color: '#F59E0B', bg: '#fffbeb' },
  roleplay: { label: '扮演', emoji: '🎭', color: '#8B5CF6', bg: '#faf5ff' },
  management: { label: '经营', emoji: '🏗️', color: '#10B981', bg: '#ecfdf5' },
  cooperative: { label: '合作', emoji: '🤝', color: '#06B6D4', bg: '#ecfeff' },
  versus: { label: '对抗', emoji: '⚔️', color: '#EF4444', bg: '#fef2f2' },
}

const DIFFICULTY_META: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  easy: { label: '简单', emoji: '🟢', color: '#059669', bg: '#ecfdf5' },
  medium: { label: '中等', emoji: '🟡', color: '#d97706', bg: '#fffbeb' },
  hard: { label: '困难', emoji: '🔴', color: '#dc2626', bg: '#fef2f2' },
}

const FILTER_OPTIONS = {
  type: [
    { key: '', label: '类型' },
    { key: 'strategy', label: '♟️ 策略' },
    { key: 'puzzle', label: '🧩 益智' },
    { key: 'auction', label: '🔨 拍卖' },
    { key: 'roleplay', label: '🎭 扮演' },
    { key: 'management', label: '🏗️ 经营' },
    { key: 'cooperative', label: '🤝 合作' },
    { key: 'versus', label: '⚔️ 对抗' },
  ],
  scene: [
    { key: '', label: '场景' },
    { key: 'gathering', label: '🎉 聚会' },
    { key: 'teambuilding', label: '🏢 团建' },
    { key: 'family', label: '👨‍👩‍👧 亲子' },
    { key: 'couple', label: '💑 情侣' },
    { key: 'drinking', label: '🍻 酒局' },
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
    { key: 'easy', label: '🟢 简单' },
    { key: 'medium', label: '🟡 中等' },
    { key: 'hard', label: '🔴 困难' },
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
      if (filters.players) params.min_players = filters.players
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

  useEffect(() => { fetchGames() }, [filters])

  const handleSearch = () => { fetchGames() }

  const handleFilterSelect = (filterKey: FilterKey, value: string) => {
    setFilters(prev => ({ ...prev, [filterKey]: value }))
    setActiveFilter(null)
  }

  const resetFilters = () => {
    setFilters({ type: '', scene: '', players: '', duration: '', difficulty: '' })
    setKeyword('')
  }

  const getFilterLabel = (filterKey: FilterKey): string => {
    const currentValue = filters[filterKey]
    if (!currentValue) return FILTER_OPTIONS[filterKey][0].label
    const option = FILTER_OPTIONS[filterKey].find(opt => opt.key === currentValue)
    return option ? option.label : FILTER_OPTIONS[filterKey][0].label
  }

  const isFilterActive = (filterKey: FilterKey): boolean => filters[filterKey] !== ''

  const hasAnyFilter = Object.values(filters).some(v => v !== '')

  const goToDetail = (id: number) => {
    Taro.navigateTo({ url: `/pages/rule-detail/index?id=${id}` })
  }

  const filterKeys: FilterKey[] = ['type', 'scene', 'players', 'duration', 'difficulty']

  // 取游戏主类型颜色
  const getGameColor = (game: BoardGame) => {
    const primaryType = game.type?.[0] || 'strategy'
    return TYPE_META[primaryType]?.color || '#4F46E5'
  }

  const getGameBg = (game: BoardGame) => {
    const primaryType = game.type?.[0] || 'strategy'
    return TYPE_META[primaryType]?.bg || '#eef2ff'
  }

  return (
    <View className="flex flex-col min-h-screen bg-gray-50">
      {/* 顶部搜索区 */}
      <View className="px-5 pt-12 pb-5 bg-white">
        <Text className="block text-2xl font-bold text-gray-900 mb-1">桌游馆 🎲</Text>
        <Text className="block text-sm text-gray-400 mb-4">发现好玩的桌游，开启精彩对局</Text>
        {/* 搜索栏 */}
        <View className="flex flex-row items-center gap-2">
          <View className="flex-1 flex flex-row items-center rounded-xl px-3 py-2 bg-gray-100">
            <Search size={16} color="#9ca3af" />
            <View className="flex-1 ml-2">
              <Input
                className="w-full bg-transparent text-sm text-gray-800"
                placeholder="搜索桌游名称..."
                placeholderClass="text-gray-400"
                value={keyword}
                onInput={(e) => setKeyword(e.detail.value)}
                onConfirm={handleSearch}
              />
            </View>
          </View>
        </View>
      </View>

      {/* 筛选栏 */}
      <View className="bg-white px-4 pb-3">
        <View className="flex flex-row items-center gap-2">
          {filterKeys.map((filterKey) => (
            <View
              key={filterKey}
              className="flex-1 relative"
              onClick={() => setActiveFilter(activeFilter === filterKey ? null : filterKey)}
            >
              <View
                className="flex flex-row items-center justify-center gap-1 rounded-lg py-2"
                style={{
                  backgroundColor: isFilterActive(filterKey) ? '#eef2ff' : '#f3f4f6',
                  borderWidth: 1,
                  borderColor: activeFilter === filterKey ? '#4F46E5' : (isFilterActive(filterKey) ? '#c7d2fe' : 'transparent'),
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
          {/* 重置按钮 */}
          {hasAnyFilter && (
            <View className="flex-shrink-0 ml-1" onClick={resetFilters}>
              <View className="flex flex-row items-center justify-center rounded-lg py-2 px-2" style={{ backgroundColor: '#fef2f2' }}>
                <RotateCcw size={12} color="#EF4444" />
              </View>
            </View>
          )}
        </View>
      </View>

      {/* 已选筛选标签 */}
      {hasAnyFilter && (
        <View className="flex flex-row flex-wrap items-center gap-2 px-5 py-2 bg-white" style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
          <Text className="text-xs text-gray-400">已选:</Text>
          {filterKeys.map(key => {
            if (!filters[key]) return null
            return (
              <View key={key} className="flex flex-row items-center rounded-full px-2 py-1" style={{ backgroundColor: '#eef2ff' }}>
                <Text className="text-xs text-indigo-600">{getFilterLabel(key)}</Text>
                <Text
                  className="text-xs text-indigo-400 ml-1"
                  onClick={() => handleFilterSelect(key, '')}
                >✕</Text>
              </View>
            )
          })}
        </View>
      )}

      {/* 点击空白关闭下拉 */}
      {activeFilter && (
        <View
          className="fixed inset-0 z-40"
          style={{ backgroundColor: 'transparent' }}
          onClick={() => setActiveFilter(null)}
        />
      )}

      {/* 游戏列表 */}
      <View className="flex-1 px-4 pt-3 pb-20">
        {loading ? (
          <View className="flex items-center justify-center py-20">
            <Text className="block text-gray-400 text-sm">加载中...</Text>
          </View>
        ) : games.length === 0 ? (
          <View className="flex flex-col items-center justify-center py-20">
            <Text className="block text-4xl mb-3">🔍</Text>
            <Text className="block text-gray-400 text-sm mb-1">暂无符合条件的桌游</Text>
            {hasAnyFilter && (
              <Text className="text-xs text-indigo-500 mt-2" onClick={resetFilters}>清除筛选条件</Text>
            )}
          </View>
        ) : (
          <View className="flex flex-col gap-3">
            {games.map((game) => {
              const gameColor = getGameColor(game)
              const gameBg = getGameBg(game)
              const difficultyInfo = DIFFICULTY_META[game.difficulty] || DIFFICULTY_META.medium
              return (
                <View
                  key={game.id}
                  className="rounded-2xl overflow-hidden bg-white shadow-sm"
                  style={{ borderWidth: 1, borderColor: '#f3f4f6', borderStyle: 'solid' }}
                  onClick={() => goToDetail(game.id)}
                >
                  {/* 顶部色条 */}
                  <View style={{ height: 4, backgroundColor: gameColor }} />
                  <View className="p-3">
                    <View className="flex flex-row items-start">
                      {/* 左侧图标 */}
                      <View className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mr-3" style={{ backgroundColor: gameBg }}>
                        <Text className="text-lg">{TYPE_META[game.type?.[0]]?.emoji || '🎲'}</Text>
                      </View>
                      {/* 右侧内容 */}
                      <View className="flex-1 min-w-0">
                        <View className="flex flex-row items-center justify-between">
                          <Text className="text-base font-bold text-gray-900">{game.name}</Text>
                          <View className="rounded-full px-2 py-1" style={{ backgroundColor: difficultyInfo.bg }}>
                            <Text className="text-xs" style={{ color: difficultyInfo.color }}>{difficultyInfo.emoji} {difficultyInfo.label}</Text>
                          </View>
                        </View>
                        <Text className="block text-xs text-gray-400 mt-1 line-clamp-1">{game.intro}</Text>

                        {/* 类型标签 */}
                        <View className="flex flex-row flex-wrap items-center gap-1 mt-2">
                          {game.type?.map((t) => {
                            const meta = TYPE_META[t]
                            return meta ? (
                              <View key={t} className="rounded-full px-2 py-1" style={{ backgroundColor: meta.bg }}>
                                <Text className="text-xs" style={{ color: meta.color }}>{meta.emoji} {meta.label}</Text>
                              </View>
                            ) : null
                          })}
                        </View>

                        {/* 底部信息条 */}
                        <View className="flex flex-row items-center gap-3 mt-2 pt-2" style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
                          <View className="flex flex-row items-center gap-1">
                            <Users size={12} color="#9ca3af" />
                            <Text className="text-xs text-gray-500">{game.min_players}-{game.max_players}人</Text>
                          </View>
                          <View className="flex flex-row items-center gap-1">
                            <Clock size={12} color="#9ca3af" />
                            <Text className="text-xs text-gray-500">{game.duration}min</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </View>
    </View>
  )
}

export default GamesPage
