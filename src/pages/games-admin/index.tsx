/* eslint-disable no-restricted-syntax */
/* eslint-disable no-restricted-syntax */
import { View, Text, ScrollView, Image, Textarea as TaroTextarea } from '@tarojs/components'
/* eslint-enable no-restricted-syntax */
/* eslint-enable no-restricted-syntax */
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { checkLogin, getCurrentUser } from '@/utils/auth'
import { Network } from '@/network'
import { MarkdownEditor } from '@/components/markdown-editor'
import type { FC } from 'react'

interface BoardGame {
  id: number
  name: string
  icon_key?: string
  image_url?: string
  type: string[]
  scene: string[]
  min_players: number
  max_players: number
  min_duration?: number
  max_duration?: number
  difficulty: string
  intro?: string
  tips?: string[]
  rules?: string
  sort_order?: number
  status?: string
}

interface GameFormData {
  name: string
  icon_key: string
  image_url: string
  type: string[]
  scene: string[]
  min_players: number
  max_players: number
  min_duration: number
  max_duration: number
  difficulty: string
  intro: string
  tips: string[]
  rules: string
  sort_order: number
  status: string
}

const TYPE_OPTIONS = [
  { label: '策略', value: 'strategy' },
  { label: '益智', value: 'puzzle' },
  { label: '拍卖', value: 'auction' },
  { label: '扮演', value: 'roleplay' },
  { label: '经营', value: 'management' },
  { label: '合作', value: 'cooperative' },
  { label: '对抗', value: 'versus' },
]
const SCENE_OPTIONS = [
  { label: '聚会', value: 'gathering' },
  { label: '团建', value: 'teambuilding' },
  { label: '亲子', value: 'family' },
  { label: '情侣', value: 'couple' },
  { label: '酒局', value: 'drinking' },
]
const STATUS_OPTIONS = [
  { value: 'online', label: '上线', desc: '所有人可见' },
  { value: 'preview', label: '预览', desc: '仅管理员可见' },
  { value: 'offline', label: '下线', desc: '仅管理员可见' }
]
const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' },
]
const STATUS_FILTER_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'online', label: '上线' },
  { value: 'preview', label: '预览' },
  { value: 'offline', label: '下线' }
]

const GamesAdminPage: FC = () => {
  const [games, setGames] = useState<BoardGame[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingGame, setEditingGame] = useState<BoardGame | null>(null)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [formData, setFormData] = useState<GameFormData>({
    name: '',
    icon_key: '🎲',
    image_url: '',
    type: [],
    scene: [],
    min_players: 2,
    max_players: 4,
    min_duration: 30,
    max_duration: 60,
    difficulty: 'medium',
    intro: '',
    tips: [],
    rules: '',
    sort_order: 0,
    status: 'online'
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
        method: 'GET',
        data: { is_admin: 'true' }
      })
      setGames(res.data.data || [])
    } catch (err) {
      console.error('[loadGames] failed:', err)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleChooseImage = () => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFilePaths[0]
        if (!tempFilePath) return
        try {
          Taro.showLoading({ title: '上传中...' })
          const uploadRes = await Network.uploadFile({
            url: '/api/user/avatar',
            filePath: tempFilePath,
            name: 'file'
          })
          const data = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data
          const imageUrl = data.data?.avatar_url || data.data?.url || data.avatar_url || data.url || ''
          setFormData(prev => ({ ...prev, image_url: imageUrl }))
          Taro.hideLoading()
          Taro.showToast({ title: '上传成功', icon: 'success' })
        } catch (err) {
          console.error('[uploadImage] failed:', err)
          Taro.hideLoading()
          Taro.showToast({ title: '上传失败', icon: 'none' })
        }
      }
    })
  }

  const handleEditGame = async (game: BoardGame) => {
    try {
      setLoading(true)
      const res = await Network.request({
        url: `/api/games/${game.id}`,
        method: 'GET',
        data: { is_admin: 'true' }
      })
      const fullGame = res.data.data
      setEditingGame(fullGame)
      setFormData({
        name: fullGame.name || '',
        icon_key: fullGame.icon_key || '🎲',
        image_url: fullGame.image_url || '',
        type: fullGame.type || [],
        scene: fullGame.scene || [],
        min_players: fullGame.min_players || 2,
        max_players: fullGame.max_players || 4,
        min_duration: fullGame.min_duration || 30,
        max_duration: fullGame.max_duration || 60,
        difficulty: fullGame.difficulty || 'medium',
        intro: fullGame.intro || '',
        tips: Array.isArray(fullGame.tips) ? fullGame.tips : [],
        rules: fullGame.rules || '',
        sort_order: fullGame.sort_order || 0,
        status: fullGame.status || 'online'
      })
      setShowModal(true)
    } catch (err) {
      console.error('[handleEditGame] failed:', err)
      Taro.showToast({ title: '加载桌游详情失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleAddGame = () => {
    setEditingGame(null)
    setFormData({
      name: '',
      icon_key: '🎲',
      image_url: '',
      type: [],
      scene: [],
      min_players: 2,
      max_players: 4,
      min_duration: 30,
      max_duration: 60,
      difficulty: 'medium',
      intro: '',
      tips: [],
      rules: '',
      sort_order: 0,
      status: 'online'
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
    if (formData.min_duration > formData.max_duration) {
      Taro.showToast({ title: '最短时长不能大于最长时长', icon: 'none' })
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


  const getStatusText = (status?: string): string => {
    const map: Record<string, string> = { online: '上线', preview: '预览', offline: '下线' }
    return map[status || 'online'] || '上线'
  }

  const getStatusColor = (status?: string): string => {
    const map: Record<string, string> = { online: '#22c55e', preview: '#eab308', offline: '#ef4444' }
    return map[status || 'online'] || '#22c55e'
  }

  const getStatusBgColor = (status?: string): string => {
    const map: Record<string, string> = { online: '#f0fdf4', preview: '#fefce8', offline: '#fef2f2' }
    return map[status || 'online'] || '#f0fdf4'
  }

  // 搜索过滤
  const filteredGames = games.filter((game) => {
    const matchName = !searchText || game.name.toLowerCase().includes(searchText.toLowerCase())
    const matchStatus = !statusFilter || game.status === statusFilter
    return matchName && matchStatus
  })

  return (
    <View className="flex flex-col min-h-screen bg-gray-50 w-full max-w-full">
      {/* Header */}
      <View className="px-5 pt-14 pb-4 bg-white border-b border-gray-100">
        <View className="flex flex-row items-center justify-between">
          <View className="flex flex-row items-center gap-3">
            <Button size="sm" variant="ghost" onClick={() => Taro.navigateBack()}>
              <Text className="text-gray-500">← 返回</Text>
            </Button>
            <Text className="text-xl font-bold text-gray-900">桌游管理</Text>
          </View>
          <Button size="sm" onClick={handleAddGame}>
            <Text className="text-sm font-medium text-white">+ 添加</Text>
          </Button>
        </View>

        {/* Search Bar */}
        <View className="mt-4 flex flex-row gap-2">
          <View className="flex-1 bg-gray-100 rounded-xl px-4 py-3">
            <Input
              className="w-full bg-transparent text-sm"
              placeholder="搜索桌游名称..."
              value={searchText}
              onInput={(e) => setSearchText(e.detail.value)}
            />
          </View>
        </View>

        {/* Status Filter */}
        <View className="mt-3 flex flex-row gap-2">
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <View
              key={opt.value}
              className={`rounded-full px-4 py-2 ${
                statusFilter === opt.value
                  ? 'bg-gray-900'
                  : 'bg-gray-100'
              }`}
              onClick={() => setStatusFilter(opt.value)}
            >
              <Text className={`text-xs ${
                statusFilter === opt.value ? 'text-white' : 'text-gray-600'
              }`}
              >
                {opt.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Game List */}
      <ScrollView className="flex-1 px-4 py-4 w-full" scrollY>
        {loading ? (
          <View className="flex items-center justify-center py-20">
            <Text className="text-gray-400">加载中...</Text>
          </View>
        ) : (
          filteredGames.map((game) => (
            <View
              key={game.id}
              className="mb-3 bg-white rounded-2xl border border-gray-100 shadow-sm"
              onClick={() => handleEditGame(game)}
            >
              <View className="flex flex-row items-center justify-between px-4 py-4" style={{ minWidth: 0 }}>
                {/* Left: Name + Status */}
                <View className="flex flex-row items-center gap-3 flex-1" style={{ minWidth: 0, overflow: 'hidden' }}>
                  <View
                    className="rounded-full px-3 py-1 flex-shrink-0"
                    style={{ backgroundColor: getStatusBgColor(game.status) }}
                  >
                    <Text style={{ color: getStatusColor(game.status), fontSize: '12px', fontWeight: 600 }}>
                      {getStatusText(game.status)}
                    </Text>
                  </View>
                  <Text className="text-base font-medium text-gray-900" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{game.name}</Text>
                </View>

                {/* Right: Delete Button */}
                <View
                  className="px-3 py-2 rounded-lg bg-red-50 flex-shrink-0 ml-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteGame(game)
                  }}
                >
                  <Text className="text-sm text-red-500">删除</Text>
                </View>
              </View>
            </View>
          ))
        )}
        {!loading && filteredGames.length === 0 && (
          <View className="flex flex-col items-center justify-center py-20">
            <Text className="text-4xl mb-3">🎲</Text>
            <Text className="text-gray-400 text-sm">
              {searchText || statusFilter ? '没有匹配的桌游' : '暂无桌游'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Edit Modal */}
      {showModal && (
        <View className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 w-full">
          <View className="w-full max-w-full bg-white h-full flex flex-col">
            {/* Modal Header */}
            <View className="px-5 pt-14 pb-4 border-b border-gray-100 flex flex-row items-center justify-between">
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

            {/* Modal Body */}
            <ScrollView className="flex-1 px-5 py-4" scrollY style={{ flex: 1, minHeight: 0, paddingBottom: 'env(safe-area-inset-bottom, 24px)' }}>
              {/* Status */}
              <View className="mb-5">
                <Text className="block text-sm font-medium text-gray-700 mb-2">状态</Text>
                <View className="flex flex-row gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <View
                      key={opt.value}
                      className={`flex-1 rounded-xl p-3 border-2 cursor-pointer ${
                        formData.status === opt.value
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, status: opt.value }))}
                    >
                      <Text className={`block font-semibold text-sm ${
                        formData.status === opt.value ? 'text-indigo-700' : 'text-gray-700'
                      }`}
                      >
                        {opt.label}
                      </Text>
                      <Text className="block text-xs text-gray-500 mt-1">{opt.desc}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Image */}
              <View className="mb-5">
                <Text className="block text-sm font-medium text-gray-700 mb-2">图片</Text>
                <View className="flex flex-row items-center gap-4">
                  <View style={{ width: '80px', height: '80px', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
                    {formData.image_url ? (
                      <Image src={formData.image_url} style={{ width: '100%', height: '100%' }} mode="aspectFill" onError={(e) => { e.stopPropagation() }} />
                    ) : (
                      <View className="flex items-center justify-center h-full">
                        <Text className="text-3xl">{formData.icon_key || '🎲'}</Text>
                      </View>
                    )}
                  </View>
                  <Button size="sm" variant="outline" onClick={handleChooseImage}>
                    <Text className="text-sm text-gray-700">选择图片</Text>
                  </Button>
                </View>
              </View>

              {/* Emoji */}
              <View className="mb-5">
                <Text className="block text-sm font-medium text-gray-700 mb-2">备用emoji</Text>
                <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <Input
                    className="w-full bg-transparent"
                    placeholder="输入emoji，如 🎲"
                    value={formData.icon_key}
                    onInput={(e) => setFormData(prev => ({ ...prev, icon_key: e.detail.value }))}
                    maxlength={2}
                  />
                </View>
              </View>

              {/* Name */}
              <View className="mb-5">
                <Text className="block text-sm font-medium text-gray-700 mb-2">桌游名称 *</Text>
                <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <Input
                    className="w-full bg-transparent"
                    placeholder="请输入桌游名称"
                    value={formData.name}
                    onInput={(e) => setFormData(prev => ({ ...prev, name: e.detail.value }))}
                  />
                </View>
              </View>

              {/* Type */}
              <View className="mb-5">
                <Text className="block text-sm font-medium text-gray-700 mb-2">类型 *</Text>
                <View className="flex flex-row flex-wrap gap-2">
                  {TYPE_OPTIONS.map((opt) => (
                    <View
                      key={opt.value}
                      className={`rounded-full px-4 py-2 cursor-pointer ${
                        formData.type.includes(opt.value)
                          ? 'bg-indigo-600'
                          : 'bg-gray-100'
                      }`}
                      onClick={() => toggleType(opt.value)}
                    >
                      <Text className={`text-sm ${
                        formData.type.includes(opt.value) ? 'text-white' : 'text-gray-600'
                      }`}
                      >
                        {opt.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Scene */}
              <View className="mb-5">
                <Text className="block text-sm font-medium text-gray-700 mb-2">场景</Text>
                <View className="flex flex-row flex-wrap gap-2">
                  {SCENE_OPTIONS.map((opt) => (
                    <View
                      key={opt.value}
                      className={`rounded-full px-4 py-2 cursor-pointer ${
                        formData.scene.includes(opt.value)
                          ? 'bg-violet-600'
                          : 'bg-gray-100'
                      }`}
                      onClick={() => toggleScene(opt.value)}
                    >
                      <Text className={`text-sm ${
                        formData.scene.includes(opt.value) ? 'text-white' : 'text-gray-600'
                      }`}
                      >
                        {opt.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Players */}
              <View className="mb-5">
                <Text className="block text-sm font-medium text-gray-700 mb-2">游戏人数</Text>
                <View className="flex flex-row items-center gap-4">
                  <View className="flex-1">
                    <Text className="block text-xs text-gray-500 mb-1">最少</Text>
                    <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
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
                    <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
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

              {/* Duration */}
              <View className="mb-5">
                <Text className="block text-sm font-medium text-gray-700 mb-2">游戏时长（分钟）</Text>
                <View className="flex flex-row items-center gap-4">
                  <View className="flex-1">
                    <Text className="block text-xs text-gray-500 mb-1">最短</Text>
                    <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                      <Input
                        className="w-full bg-transparent"
                        type="number"
                        value={String(formData.min_duration)}
                        onInput={(e) => setFormData(prev => ({ ...prev, min_duration: Number(e.detail.value) }))}
                      />
                    </View>
                  </View>
                  <Text className="text-gray-400">-</Text>
                  <View className="flex-1">
                    <Text className="block text-xs text-gray-500 mb-1">最长</Text>
                    <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                      <Input
                        className="w-full bg-transparent"
                        type="number"
                        value={String(formData.max_duration)}
                        onInput={(e) => setFormData(prev => ({ ...prev, max_duration: Number(e.detail.value) }))}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Difficulty */}
              <View className="mb-5">
                <Text className="block text-sm font-medium text-gray-700 mb-2">难度</Text>
                <View className="flex flex-row flex-wrap gap-2">
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <View
                      key={opt.value}
                      className={`rounded-full px-4 py-2 cursor-pointer ${
                        formData.difficulty === opt.value
                          ? 'bg-orange-500'
                          : 'bg-gray-100'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, difficulty: opt.value }))}
                    >
                      <Text className={`text-sm ${
                        formData.difficulty === opt.value ? 'text-white' : 'text-gray-600'
                      }`}
                      >
                        {opt.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Intro */}
              <View className="mb-5">
                <Text className="block text-sm font-medium text-gray-700 mb-2">简介</Text>
                {/* eslint-disable-next-line no-restricted-syntax */}
                <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <TaroTextarea
                    className="w-full bg-transparent"
                    style={{ height: '72px' }}
                    placeholder="请输入桌游简介"
                    value={formData.intro}
                    onInput={(e) => setFormData(prev => ({ ...prev, intro: e.detail.value }))}
                  />
                </View>
              </View>

              {/* Tips */}
              <View className="mb-5">
                <Text className="block text-sm font-medium text-gray-700 mb-2">小贴士</Text>
                {formData.tips.map((tip, idx) => (
                  <View key={idx} className="flex flex-row items-center gap-2 mb-2">
                    <View className="flex-1 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                      <Input
                        className="w-full bg-transparent"
                        placeholder={`第 ${idx + 1} 条贴士`}
                        value={tip}
                        onInput={(e) => {
                          const next = [...formData.tips]
                          next[idx] = e.detail.value
                          setFormData(prev => ({ ...prev, tips: next }))
                        }}
                      />
                    </View>
                    <View
                      className="px-3 py-3 rounded-xl bg-red-50"
                      onClick={() => setFormData(prev => ({ ...prev, tips: prev.tips.filter((_, i) => i !== idx) }))}
                    >
                      <Text className="text-sm text-red-500">删除</Text>
                    </View>
                  </View>
                ))}
                <Button size="sm" variant="outline" onClick={() => setFormData(prev => ({ ...prev, tips: [...prev.tips, ''] }))}>
                  <Text className="text-sm text-gray-700">+ 添加贴士</Text>
                </Button>
              </View>

              {/* Rules */}
              <MarkdownEditor
                value={formData.rules}
                onChange={(value) => setFormData(prev => ({ ...prev, rules: value }))}
                placeholder="请输入游戏规则，支持 Markdown 语法..."
                minHeight={300}
              />

              {/* Sort Order */}
              <View className="mb-5">
                <Text className="block text-sm font-medium text-gray-700 mb-2">排序</Text>
                <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <Input
                    className="w-full bg-transparent"
                    type="number"
                    placeholder="数字越小越靠前"
                    value={String(formData.sort_order)}
                    onInput={(e) => setFormData(prev => ({ ...prev, sort_order: Number(e.detail.value) }))}
                  />
                </View>
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  )
}

export default GamesAdminPage
