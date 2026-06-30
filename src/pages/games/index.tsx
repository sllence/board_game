import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useShareAppMessage } from '@tarojs/taro'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Network } from '@/network'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, RotateCcw } from 'lucide-react-taro'
import { TYPE_META, SCENE_META, DIFFICULTY_META } from '@/constants/game'
import type { FC } from 'react'

interface BoardGame {
  id: number
  name: string
  type: string[]
  scene: string[]
  min_players: number
  max_players: number
  min_duration: number
  max_duration: number
  difficulty: string
  icon_key: string
  icon_bg: string
  icon_color: string
  intro: string
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
    { key: '2', label: '2 人' },
    { key: '3', label: '3 人' },
    { key: '4', label: '4 人' },
    { key: '5', label: '5 人' },
    { key: '6', label: '6 人+' },
  ],
  duration: [
    { key: '', label: '时长' },
    { key: '15', label: '15 分钟内' },
    { key: '30', label: '30 分钟内' },
    { key: '45', label: '45 分钟内' },
    { key: '60', label: '60 分钟内' },
  ],
  difficulty: [
    { key: '', label: '难度' },
    { key: 'easy', label: '🟢 简单' },
    { key: 'medium', label: '🟡 中等' },
    { key: 'hard', label: '🔴 困难' },
  ],
} as const

type FilterKey = keyof typeof FILTER_OPTIONS

const PAGE_SIZE = 10

const GamesPage: FC = () => {
  useShareAppMessage(() => ({ title: '数智局伴-桌游馆-海量桌游规则与攻略', path: '/pages/games/index' }))
  const [games, setGames] = useState<BoardGame[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null)
  const [filters, setFilters] = useState({
    type: '',
    scene: '',
    players: '',
    duration: '',
    difficulty: '',
  })

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)
  // 保存当前过滤条件，用于 loadMore 时读取最新的值
  const filtersRef = useRef(filters)
  const keywordRef = useRef(keyword)
  filtersRef.current = filters
  keywordRef.current = keyword

  const fetchGames = async (pageNum: number, append = false) => {
    if (!append) setLoading(true)
    else setLoadingMore(true)
    try {
      const params: Record<string, string> = { page: String(pageNum), page_size: String(PAGE_SIZE) }
      const f = filtersRef.current
      const kw = keywordRef.current
      if (f.type) params.type = f.type
      if (f.scene) params.scene = f.scene
      if (f.difficulty) params.difficulty = f.difficulty
      if (f.duration) params.duration = f.duration
      if (f.players) params.min_players = f.players
      if (kw) params.keyword = kw
      const queryStr = new URLSearchParams(params).toString()
      const url = `/api/games${queryStr ? '?' + queryStr : ''}`
      console.log('[GamesPage] fetchGames url:', url)
      const res = await Network.request({ url })
      console.log('[GamesPage] fetchGames response:', res.data)
      const data: BoardGame[] = res.data?.data || []
      const total: number = res.data?.total ?? 0
      if (append) {
        setGames(prev => [...prev, ...data])
      } else {
        setGames(data)
      }
      setPage(pageNum)
      setHasMore(append ? (games.length + data.length < total) : (data.length < total))
    } catch (err) {
      console.error('[GamesPage] fetchGames error:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // 首次加载 / 筛选或搜索变化时重置
  useEffect(() => {
    setPage(1)
    setGames([])
    setHasMore(true)
    fetchGames(1, false)
  }, [filters, keyword])

  // 防抖搜索处理
  const handleSearchInput = useCallback((value: string) => {
    setKeyword(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      // keyword 变化会触发 useEffect
    }, 300)
  }, [])

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

  const handleSearch = () => { fetchGames(page, false) }

  const handleFilterSelect = (filterKey: FilterKey, value: string) => {
    setFilters(prev => ({ ...prev, [filterKey]: value }))
    setActiveFilter(null)
  }

  const resetFilters = () => {
    setFilters({ type: '', scene: '', players: '', duration: '', difficulty: '' })
    setKeyword('')
  }

  const loadMore = () => {
    if (loadingMore || !hasMore) return
    fetchGames(page + 1, true)
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

  const getGameColor = (game: BoardGame) => {
    const primaryType = game.type?.[0] || 'strategy'
    return TYPE_META[primaryType]?.color || '#4F46E5'
  }

  return (
    <View className="flex flex-col h-screen bg-background">
      {/* 顶部搜索区 */}
      <View className="px-5 pt-12 pb-5 bg-white flex-shrink-0">
        <Text className="block text-2xl font-bold text-gray-900 mb-1">桌游馆 🎲</Text>
        <Text className="block text-sm text-gray-400 mb-4">发现好玩的桌游，开启精彩对局</Text>
        <View className="flex flex-row items-center gap-2">
          <View className="flex-1 flex flex-row items-center rounded-xl px-3 py-2 bg-white border border-gray-200">
            <Search size={16} color="#9ca3af" />
            <View className="flex-1 ml-2">
              <Input
                className="w-full bg-transparent text-sm border-none shadow-none ring-0"
                placeholder="搜索桌游名称..."
                placeholderClass="text-gray-400"
                value={keyword}
                onInput={(e) => handleSearchInput(e.detail.value)}
                onConfirm={handleSearch}
              />
            </View>
          </View>
        </View>
      </View>

      {/* 筛选栏 */}
      <View className="bg-white px-4 pb-3 flex-shrink-0">
        <View className="flex flex-row items-center gap-2">
          {filterKeys.map((filterKey) => (
            <View
              key={filterKey}
              className="flex-1 relative"
              onClick={() => setActiveFilter(activeFilter === filterKey ? null : filterKey)}
            >
              <Button
                variant={isFilterActive(filterKey) ? 'secondary' : 'outline'}
                className={`flex-1 justify-center py-2 h-auto ${isFilterActive(filterKey) ? 'bg-indigo-50 border-indigo-600' : 'border-gray-200'}`}
              >
                <Text className="text-xs">{getFilterLabel(filterKey)}</Text>
              </Button>
              {activeFilter === filterKey && (
                <View
                  className="absolute left-0 right-0 top-full mt-1 rounded-xl shadow-lg z-50 overflow-hidden"
                  style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'solid' }}
                >
                  {FILTER_OPTIONS[filterKey].map((option) => (
                    <View
                      key={option.key}
                      className="py-2 px-3"
                      style={{ backgroundColor: filters[filterKey] === option.key ? '#eef2ff' : '#fff' }}
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
          {hasAnyFilter && (
            <Button variant="ghost" size="sm" className="h-auto py-2 px-3 flex-shrink-0" onClick={resetFilters}>
              <RotateCcw size={12} color="#6b7280" className="mr-1" />
              <Text className="text-xs">重置</Text>
            </Button>
          )}
        </View>
      </View>

      {/* 已选筛选标签 */}
      {hasAnyFilter && (
        <View className="flex flex-row flex-wrap items-center gap-2 px-5 py-2 bg-white flex-shrink-0" style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
          <Text className="text-xs text-gray-400">已选:</Text>
          {filterKeys.map(key => {
            if (!filters[key]) return null
            return (
              <Badge key={key} variant="secondary" className="text-xs bg-indigo-50">
                <Text className="text-indigo-600">{getFilterLabel(key)}</Text>
                <Text
                  className="ml-2 text-indigo-400 hover:text-indigo-600 cursor-pointer"
                  onClick={() => handleFilterSelect(key, '')}
                >✕</Text>
              </Badge>
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

      {/* 游戏列表 - ScrollView 滑动加载 */}
      <ScrollView
        className="flex-1 px-4 pt-3"
        scrollY
        style={{ height: '100%' }}
        onScrollToLower={loadMore}
        scrollWithAnimation
      >
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
          <View className="flex flex-col gap-3 pb-20">
            {games.map((game) => {
              const gameColor = getGameColor(game)
              const difficultyInfo = DIFFICULTY_META[game.difficulty] || DIFFICULTY_META.medium
              return (
                <Card
                  key={game.id}
                  className="overflow-hidden"
                  style={{ borderTopWidth: 4, borderTopColor: gameColor }}
                  onClick={() => goToDetail(game.id)}
                >
                  <CardContent className="p-3">
                    <View className="flex flex-row items-start">
                      <View className="flex-1 min-w-0">
                        <View className="flex flex-row items-center justify-between">
                          <View className="flex flex-row items-center gap-2 min-w-0 flex-1">
                            <Text className="text-base font-bold text-gray-900 flex-shrink-0">{game.name}</Text>
                            <View className="flex flex-row items-center gap-2">
                              <Text className="text-xs text-gray-400">👥 {game.min_players}-{game.max_players}人</Text>
                              <Text className="text-xs text-gray-400">⏱ {game.min_duration}-{game.max_duration}分钟</Text>
                            </View>
                          </View>
                          <Badge variant="outline" style={{ backgroundColor: difficultyInfo.bg, color: difficultyInfo.color }}>
                            <Text className="text-xs">{difficultyInfo.emoji} {difficultyInfo.label}</Text>
                          </Badge>
                        </View>
                        <Text className="block text-xs text-gray-400 mt-1 line-clamp-1">{game.intro}</Text>
                        <View className="flex flex-row flex-wrap items-center gap-1 mt-2">
                          {game.type?.map((t) => {
                            const meta = TYPE_META[t]
                            return meta ? (
                              <Badge key={t} variant="outline" style={{ backgroundColor: meta.bg, color: meta.color }}>
                                <Text className="text-xs">{meta.emoji} {meta.label}</Text>
                              </Badge>
                            ) : null
                          })}
                          {game.scene?.map((s) => {
                            const meta = SCENE_META[s]
                            return meta ? (
                              <Badge key={s} variant="outline" style={{ backgroundColor: meta.bg, color: meta.color }}>
                                <Text className="text-xs">{meta.emoji} {meta.label}</Text>
                              </Badge>
                            ) : null
                          })}
                        </View>
                      </View>
                    </View>
                  </CardContent>
                </Card>
              )
            })}
            {/* 底部加载指示器 */}
            {loadingMore && (
              <View className="flex items-center justify-center py-4">
                <Text className="block text-sm text-gray-400">加载中...</Text>
              </View>
            )}
            {!hasMore && games.length > 0 && (
              <View className="flex items-center justify-center py-4">
                <Text className="block text-sm text-gray-400">没有更多了</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default GamesPage