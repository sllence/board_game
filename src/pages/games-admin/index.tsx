import { View, Text, ScrollView } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { checkLogin, getCurrentUser } from '@/utils/auth'
import { Network } from '@/network'
import type { FC } from 'react'

interface BoardGame {
  id: number
  name: string
  emoji?: string
  icon_key?: string
  type: string[]
  scene: string[]
  min_players: number
  max_players: number
  duration: number
  difficulty: number
  intro?: string
  sort_order?: number
}

interface GameFormData {
  name: string
  icon_key: string
  type: string[]
  scene: string[]
  min_players: number
  max_players: number
  duration: number
  difficulty: number
  intro: string
  sort_order: number
}

const TYPE_OPTIONS = ['策略', '益智', '拍卖', '扮演', '经营', '合作', '对抗']
const SCENE_OPTIONS = ['聚会', '团建', '亲子', '情侣', '酒局']
const DIFFICULTY_OPTIONS = [
  { value: 1, label: '入门' },
  { value: 2, label: '简单' },
  { value: 3, label: '中等' },
  { value: 4, label: '困难' },
  { value: 5, label: '专家' }
]

const GamesAdminPage: FC = () => {
  const [games, setGames] = useState<BoardGame[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingGame, setEditingGame] = useState<BoardGame | null>(null)
  const [formData, setFormData] = useState<GameFormData>({
    name: '',
    icon_key: '🎲',
    type: [],
    scene: [],
    min_players: 2,
    max_players: 4,
    duration: 30,
    difficulty: 3,
    intro: '',
    sort_order: 0
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
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

  const handleEditGame = (game: BoardGame) => {
    setEditingGame(game)
    setFormData({
      name: game.name || '',
      icon_key: game.icon_key || '🎲',
      type: game.type || [],
      scene: game.scene || [],
      min_players: game.min_players || 2,
      max_players: game.max_players || 4,
      duration: game.duration || 30,
      difficulty: game.difficulty || 3,
      intro: game.intro || '',
      sort_order: game.sort_order || 0
    })
    setShowModal(true)
  }

  const handleAddGame = () => {
    setEditingGame(null)
    setFormData({
      name: '',
      icon_key: '🎲',
      type: [],
      scene: [],
      min_players: 2,
      max_players: 4,
      duration: 30,
      difficulty: 3,
      intro: '',
      sort_order: 0
    })
    setShowModal(true)
  }

  const handleDeleteGame = (game: BoardGame) => {
    Taro.showModal({
      title: '确认删除',
      content: `确定要删除桌游「${game.name}」吗？`,
      confirmText: '删除',
      cancelText: '取消',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (res.confirm) {
          try {
            await Network.request({
              url: `/api/games/${game.id}`,
              method: 'DELETE'
            })
            Taro.showToast({ title: '删除成功', icon: 'success' })
            loadGames()
          } catch (err) {
            console.error('[deleteGame] failed:', err)
            Taro.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  }

  const handleSaveGame = async () => {
    if (!formData.name.trim()) {
      Taro.showToast({ title: '请输入桌游名称', icon: 'none' })
      return
    }
    if (formData.type.length === 0) {
      Taro.showToast({ title: '请至少选择一个类型', icon: 'none' })
      return
    }
    if (formData.min_players > formData.max_players) {
      Taro.showToast({ title: '最少人数不能大于最多人数', icon: 'none' })
      return
    }

    try {
      setSaving(true)
      if (editingGame) {
        await Network.request({
          url: `/api/games/${editingGame.id}`,
          method: 'PUT',
          data: formData
        })
        Taro.showToast({ title: '更新成功', icon: 'success' })
      } else {
        await Network.request({
          url: '/api/games',
          method: 'POST',
          data: { ...formData, is_active: true }
        })
        Taro.showToast({ title: '创建成功', icon: 'success' })
      }
      setShowModal(false)
      loadGames()
    } catch (err) {
      console.error('[saveGame] failed:', err)
      Taro.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const toggleType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      type: prev.type.includes(type)
        ? prev.type.filter(t => t !== type)
        : [...prev.type, type]
    }))
  }

  const toggleScene = (scene: string) => {
    setFormData(prev => ({
      ...prev,
      scene: prev.scene.includes(scene)
        ? prev.scene.filter(s => s !== scene)
        : [...prev.scene, scene]
    }))
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
                    <Text className="text-3xl">{game.icon_key || game.emoji || '🎲'}</Text>
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
                  <View className="flex flex-row gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEditGame(game)}>
                      <Text className="text-indigo-600 text-sm">编辑</Text>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteGame(game)}>
                      <Text className="text-red-600 text-sm">删除</Text>
                    </Button>
                  </View>
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

      {/* 编辑/添加弹窗 */}
      {showModal && (
        <View className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <View className="w-full bg-white rounded-t-2xl max-h-[85vh]">
            {/* 弹窗顶部 */}
            <View className="px-5 py-4 border-b border-gray-100 flex flex-row items-center justify-between">
              <Button size="sm" variant="ghost" onClick={() => setShowModal(false)}>
                <Text className="text-gray-500">取消</Text>
              </Button>
              <Text className="font-semibold text-gray-900">
                {editingGame ? '编辑桌游' : '添加桌游'}
              </Text>
              <Button size="sm" onClick={handleSaveGame} disabled={saving}>
                <Text className="text-sm">{saving ? '保存中...' : '保存'}</Text>
              </Button>
            </View>

            {/* 弹窗内容 */}
            <ScrollView className="px-5 py-4 max-h-[70vh]" scrollY>
              {/* 图标 */}
              <View className="mb-4">
                <Text className="block text-sm font-medium text-gray-700 mb-2">图标</Text>
                <View className="bg-gray-50 rounded-xl px-4 py-3">
                  <Input
                    className="w-full bg-transparent"
                    placeholder="输入emoji，如 🎲"
                    value={formData.icon_key}
                    onInput={(e) => setFormData(prev => ({ ...prev, icon_key: e.detail.value }))}
                    maxlength={2}
                  />
                </View>
              </View>

              {/* 名称 */}
              <View className="mb-4">
                <Text className="block text-sm font-medium text-gray-700 mb-2">桌游名称 *</Text>
                <View className="bg-gray-50 rounded-xl px-4 py-3">
                  <Input
                    className="w-full bg-transparent"
                    placeholder="请输入桌游名称"
                    value={formData.name}
                    onInput={(e) => setFormData(prev => ({ ...prev, name: e.detail.value }))}
                  />
                </View>
              </View>

              {/* 类型 */}
              <View className="mb-4">
                <Text className="block text-sm font-medium text-gray-700 mb-2">类型 *</Text>
                <View className="flex flex-row flex-wrap gap-2">
                  {TYPE_OPTIONS.map((type) => (
                    <View
                      key={type}
                      className={`rounded-full px-3 py-2 cursor-pointer ${
                        formData.type.includes(type)
                          ? 'bg-indigo-600'
                          : 'bg-gray-100'
                      }`}
                      onClick={() => toggleType(type)}
                    >
                      <Text className={`text-sm ${
                        formData.type.includes(type)
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}
                      >
                        {type}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* 场景 */}
              <View className="mb-4">
                <Text className="block text-sm font-medium text-gray-700 mb-2">场景</Text>
                <View className="flex flex-row flex-wrap gap-2">
                  {SCENE_OPTIONS.map((scene) => (
                    <View
                      key={scene}
                      className={`rounded-full px-3 py-2 cursor-pointer ${
                        formData.scene.includes(scene)
                          ? 'bg-purple-600'
                          : 'bg-gray-100'
                      }`}
                      onClick={() => toggleScene(scene)}
                    >
                      <Text className={`text-sm ${
                        formData.scene.includes(scene)
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}
                      >
                        {scene}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* 人数 */}
              <View className="mb-4">
                <Text className="block text-sm font-medium text-gray-700 mb-2">游戏人数</Text>
                <View className="flex flex-row items-center gap-4">
                  <View className="flex-1">
                    <Text className="block text-xs text-gray-500 mb-1">最少</Text>
                    <View className="bg-gray-50 rounded-xl px-4 py-3">
                      <Input
                        className="w-full bg-transparent"
                        type="number"
                        value={String(formData.min_players)}
                        onInput={(e) => setFormData(prev => ({ ...prev, min_players: Number(e.detail.value) }))}
                      />
                    </View>
                  </View>
                  <Text className="text-gray-400">-</Text>
                  <View className="flex-1">
                    <Text className="block text-xs text-gray-500 mb-1">最多</Text>
                    <View className="bg-gray-50 rounded-xl px-4 py-3">
                      <Input
                        className="w-full bg-transparent"
                        type="number"
                        value={String(formData.max_players)}
                        onInput={(e) => setFormData(prev => ({ ...prev, max_players: Number(e.detail.value) }))}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* 时长 */}
              <View className="mb-4">
                <Text className="block text-sm font-medium text-gray-700 mb-2">游戏时长（分钟）</Text>
                <View className="bg-gray-50 rounded-xl px-4 py-3">
                  <Input
                    className="w-full bg-transparent"
                    type="number"
                    value={String(formData.duration)}
                    onInput={(e) => setFormData(prev => ({ ...prev, duration: Number(e.detail.value) }))}
                  />
                </View>
              </View>

              {/* 难度 */}
              <View className="mb-4">
                <Text className="block text-sm font-medium text-gray-700 mb-2">难度</Text>
                <View className="flex flex-row flex-wrap gap-2">
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <View
                      key={opt.value}
                      className={`rounded-full px-3 py-2 cursor-pointer ${
                        formData.difficulty === opt.value
                          ? 'bg-orange-600'
                          : 'bg-gray-100'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, difficulty: opt.value }))}
                    >
                      <Text className={`text-sm ${
                        formData.difficulty === opt.value
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}
                      >
                        {opt.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* 简介 */}
              <View className="mb-4">
                <Text className="block text-sm font-medium text-gray-700 mb-2">简介</Text>
                <View className="bg-gray-50 rounded-xl px-4 py-3">
                  <Input
                    className="w-full bg-transparent"
                    placeholder="请输入桌游简介"
                    value={formData.intro}
                    onInput={(e) => setFormData(prev => ({ ...prev, intro: e.detail.value }))}
                  />
                </View>
              </View>

              {/* 排序 */}
              <View className="mb-4">
                <Text className="block text-sm font-medium text-gray-700 mb-2">排序</Text>
                <View className="bg-gray-50 rounded-xl px-4 py-3">
                  <Input
                    className="w-full bg-transparent"
                    type="number"
                    value={String(formData.sort_order)}
                    onInput={(e) => setFormData(prev => ({ ...prev, sort_order: Number(e.detail.value) }))}
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  )
}

export default GamesAdminPage
