import { View, Text, ScrollView } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { checkLogin, getCurrentUser } from '@/utils/auth'
import { Network } from '@/network'
import type { FC } from 'react'

interface BoardGame {
  id: number
  name: string
  emoji: string
  type: string[]
  scene: string[]
  min_players: number
  max_players: number
  duration: number
  difficulty: number
}

const GamesAdminPage: FC = () => {
  const [games, setGames] = useState<BoardGame[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 检查登录和管理员权限
    if (!checkLogin()) {
      Taro.showModal({
        title: '需要登录',
        content: '请先登录后再使用此功能',
        confirmText: '去登录',
        cancelText: '返回',
        showCancel: true,
        success: (res) => {
          if (res.confirm) {
            Taro.switchTab({ url: '/pages/profile/index' })
          } else {
            Taro.navigateBack()
          }
        }
      })
      return
    }

    const user = getCurrentUser()
    if (!user?.is_admin) {
      Taro.showModal({
        title: '无权限',
        content: '只有管理员可以访问此页面',
        confirmText: '返回',
        showCancel: false,
        success: () => {
          Taro.navigateBack()
        }
      })
      return
    }

    loadGames()
  }, [])

  const loadGames = async () => {
    try {
      setLoading(true)
      const res = await Network.request({
        url: '/api/games',
        method: 'GET'
      })
      setGames(res.data.data || [])
    } catch (err) {
      console.error('[loadGames] failed:', err)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleEditGame = (_game: BoardGame) => {
    Taro.showToast({ title: '编辑功能开发中', icon: 'none' })
  }

  const handleAddGame = () => {
    Taro.showToast({ title: '添加功能开发中', icon: 'none' })
  }

  const getDifficultyText = (difficulty: number): string => {
    const map: Record<number, string> = { 1: '入门', 2: '简单', 3: '中等', 4: '困难', 5: '专家' }
    return map[difficulty] || '中等'
  }

  const getDifficultyColor = (difficulty: number): string => {
    const map: Record<number, string> = {
      1: '#22c55e', 2: '#84cc16', 3: '#eab308', 4: '#f97316', 5: '#ef4444'
    }
    return map[difficulty] || '#eab308'
  }

  return (
    <View className="flex flex-col min-h-screen bg-[#f5f5f7]">
      {/* 顶部导航栏区域 */}
      <View className="px-5 pt-14 pb-4 bg-white border-b border-gray-100">
        <View className="flex flex-row items-center justify-between">
          <View className="flex flex-row items-center gap-3">
            <Button size="sm" variant="ghost" onClick={() => Taro.navigateBack()}>
              <Text className="text-gray-600">← 返回</Text>
            </Button>
            <Text className="text-xl font-bold text-gray-900">桌游管理</Text>
          </View>
          <Button size="sm" onClick={handleAddGame}>
            <Text className="text-sm">+ 添加桌游</Text>
          </Button>
        </View>
      </View>

      {/* 桌游列表 */}
      <ScrollView className="flex-1 px-4 py-4" scrollY>
        {loading ? (
          <View className="flex items-center justify-center py-20">
            <Text className="text-gray-400">加载中...</Text>
          </View>
        ) : (
          games.map((game) => (
            <Card key={game.id} className="border-0 shadow-sm mb-3">
              <CardContent className="p-4">
                <View className="flex flex-row items-start justify-between">
                  <View className="flex flex-row items-start gap-3 flex-1">
                    <Text className="text-3xl">{game.emoji}</Text>
                    <View className="flex-1">
                      <Text className="block font-semibold text-gray-900 mb-1">{game.name}</Text>
                      <View className="flex flex-row flex-wrap gap-1 mb-2">
                        {game.type.slice(0, 3).map((t) => (
                          <View
                            key={t}
                            className="rounded-full px-2 py-1"
                            style={{ backgroundColor: 'rgba(99,102,241,0.1)' }}
                          >
                            <Text className="text-xs text-indigo-600">{t}</Text>
                          </View>
                        ))}
                        {game.type.length > 3 && (
                          <Text className="text-xs text-gray-400">+{game.type.length - 3}</Text>
                        )}
                      </View>
                      <View className="flex flex-row items-center gap-4 text-xs text-gray-500">
                        <Text className="block">👥 {game.min_players}-{game.max_players}人</Text>
                        <Text className="block">⏱️ {game.duration}分钟</Text>
                        <View
                          className="rounded-full px-2 py-1"
                          style={{ backgroundColor: `${getDifficultyColor(game.difficulty)}20` }}
                        >
                          <Text style={{ color: getDifficultyColor(game.difficulty), fontSize: '12px' }}>
                            {getDifficultyText(game.difficulty)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <Button size="sm" variant="ghost" onClick={() => handleEditGame(game)}>
                    <Text className="text-indigo-600 text-sm">编辑</Text>
                  </Button>
                </View>
              </CardContent>
            </Card>
          ))
        )}
        {!loading && games.length === 0 && (
          <View className="flex flex-col items-center justify-center py-20">
            <Text className="text-4xl mb-3">🎲</Text>
            <Text className="text-gray-400 text-sm">暂无桌游</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default GamesAdminPage
