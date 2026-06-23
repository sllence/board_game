import { View, Text, ScrollView, Image } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

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

interface GameRule {
  id: number | null
  game_id: number
  title: string
  rule_type: 'markdown' | 'images'
  content: string
  image_urls: string[]
  sort_order: number
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
  const [rules, setRules] = useState<GameRule[]>([])
  const [editingRule, setEditingRule] = useState<GameRule | null>(null)
  const [showRuleEditor, setShowRuleEditor] = useState(false)
  const [ruleUploading, setRuleUploading] = useState(false)
  const [selectedPdfPath, setSelectedPdfPath] = useState<string | null>(null)

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
      setGames(res.data?.data || [])
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
      const fullGame = res.data?.data
      if (!fullGame) {
        Taro.showToast({ title: '获取游戏详情失败', icon: 'none' })
        return
      }
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
      // 加载该桌游已有的规则
      loadRules(fullGame.id)
    } catch (err) {
      console.error('[handleEditGame] failed:', err)
      Taro.showToast({ title: '加载桌游详情失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const loadRules = async (gameId: number) => {
    try {
      const res = await Network.request({ url: '/api/game-rules', method: 'GET', data: { game_id: gameId } })
      setRules(res.data?.data || [])
    } catch (err) {
      console.error('[loadRules] failed:', err)
      setRules([])
    }
  }

  const handleAddRule = () => {
    setEditingRule({
      id: null,
      game_id: editingGame?.id || 0,
      title: '',
      rule_type: 'markdown',
      content: '',
      image_urls: [],
      sort_order: rules.length,
    })
    setShowRuleEditor(true)
  }

  const handleEditRule = (rule: GameRule) => {
    setEditingRule({ ...rule })
    setShowRuleEditor(true)
  }

  const handleSaveRule = async () => {
    if (!editingRule) return
    if (!editingRule.title.trim()) {
      Taro.showToast({ title: '请输入规则标题', icon: 'none' })
      return
    }

    try {
      if (selectedPdfPath) {
        // 有 PDF 文件：通过 uploadFile 同时提交规则数据和 PDF，后端异步转换
        const uploadRes = await Network.uploadFile({
          url: '/api/game-rules/with-pdf',
          filePath: selectedPdfPath,
          name: 'file',
          formData: {
            game_id: String(editingRule.game_id || editingGame?.id || ''),
            title: editingRule.title,
            rule_type: editingRule.rule_type || 'images',
            content: editingRule.content || '',
            sort_order: String(editingRule.sort_order || 0),
          }
        })
        let parsed: any
        try {
          parsed = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data
        } catch {
          throw new Error('服务响应异常')
        }
        if (parsed?.data) {
          setRules(prev => [...prev, parsed.data])
        }
        setSelectedPdfPath(null)
        Taro.showToast({ title: '规则已保存，PDF正在后台转换...', icon: 'success' })
      } else if (editingRule.id) {
        // Update existing rule
        const res = await Network.request({
          url: `/api/game-rules/${editingRule.id}`,
          method: 'PUT',
          data: {
            title: editingRule.title,
            rule_type: editingRule.rule_type,
            content: editingRule.content,
            image_urls: editingRule.image_urls,
            sort_order: editingRule.sort_order,
          }
        })
        setRules(prev => prev.map(r => r.id === editingRule.id ? res.data?.data : r))
        Taro.showToast({ title: '规则已更新', icon: 'success' })
      } else {
        // Create new rule (JSON, no PDF)
        const res = await Network.request({
          url: '/api/game-rules',
          method: 'POST',
          data: {
            game_id: editingRule.game_id || editingGame?.id,
            title: editingRule.title,
            rule_type: editingRule.rule_type,
            content: editingRule.content,
            image_urls: editingRule.image_urls,
            sort_order: editingRule.sort_order,
          }
        })
        setRules(prev => [...prev, res.data?.data])
        Taro.showToast({ title: '规则已添加', icon: 'success' })
      }
      setShowRuleEditor(false)
      setEditingRule(null)
    } catch (err) {
      console.error('[saveRule] failed:', err)
      Taro.showToast({ title: '保存规则失败', icon: 'none' })
    }
  }

  const handleDeleteRule = (rule: GameRule) => {
    Taro.showModal({
      title: '确认删除',
      content: `确定要删除规则「${rule.title}」吗？`,
      confirmText: '删除',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (res.confirm) {
          try {
            if (rule.id) {
              await Network.request({ url: `/api/game-rules/${rule.id}`, method: 'DELETE' })
            }
            setRules(prev => prev.filter(r => r.id !== rule.id))
            Taro.showToast({ title: '删除成功', icon: 'success' })
          } catch (err) {
            console.error('[deleteRule] failed:', err)
            Taro.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  }

  const handleUploadRuleImage = async () => {
    try {
      Taro.chooseImage({ count: 9, sizeType: ['compressed'], sourceType: ['album'] })
        .then(async (res) => {
          setRuleUploading(true)
          const urls: string[] = []
          for (const filePath of res.tempFilePaths) {
            const uploadRes = await Network.uploadFile({
              url: '/api/upload',
              filePath,
              name: 'file'
            })
            const data = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data
            const url = data.data?.url || data.url || ''
            if (url) urls.push(url)
          }
          setEditingRule(prev => prev ? { ...prev, image_urls: [...prev.image_urls, ...urls] } : null)
          Taro.showToast({ title: '上传成功', icon: 'success' })
        })
    } catch (err) {
      console.error('[uploadRuleImage] failed:', err)
      Taro.showToast({ title: '上传失败', icon: 'none' })
    } finally {
      setRuleUploading(false)
    }
  }

  const handleMoveRule = (index: number, direction: 'up' | 'down') => {
    const newRules = [...rules]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newRules.length) return
    ;[newRules[index], newRules[targetIndex]] = [newRules[targetIndex], newRules[index]]
    newRules.forEach((r, i) => { r.sort_order = i })
    setRules(newRules)
  }

  const handleAddGame = () => {
    setEditingGame(null)
    setRules([])
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
    <View className="flex flex-col min-h-screen bg-background" style={{ overflowX: 'hidden' }}>
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
          <Input
            className="flex-1"
            placeholder="搜索桌游名称..."
            value={searchText}
            onInput={(e) => setSearchText(e.detail.value)}
          />
        </View>

        {/* Status Filter */}
        <View className="mt-3 flex flex-row gap-2">
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <View
              key={opt.value}
              className={`rounded-full px-4 py-2 ${
                statusFilter === opt.value
                  ? 'bg-gray-900'
                  : 'bg-white border border-gray-200'
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
      <ScrollView className="flex-1 px-4 py-4" scrollY>
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
              <View className="flex flex-row items-center justify-between px-4 py-4">
                {/* Left: Name + Status */}
                <View className="flex flex-row items-center gap-3 flex-1">
                  <View
                    className="rounded-full px-3 py-1"
                    style={{ backgroundColor: getStatusBgColor(game.status) }}
                  >
                    <Text className="text-xs font-semibold" style={{ color: getStatusColor(game.status) }}>
                      {getStatusText(game.status)}
                    </Text>
                  </View>
                  <Text className="text-base font-medium text-gray-900">{game.name}</Text>
                </View>

                {/* Right: Delete Button */}
                <View
                  className="px-3 py-2 rounded-lg bg-red-50"
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
        <View className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50" style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
          <View className="w-full bg-white h-full flex flex-col" style={{ maxWidth: '100vw' }}>
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
                      className={`flex-1 min-w-0 rounded-xl p-3 border-2 cursor-pointer ${
                        formData.status === opt.value
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 bg-white'
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
                  <View className="w-20 h-20 rounded-2xl overflow-hidden" style={{ backgroundColor: '#f3f4f6' }}>
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
                <Input
                  className="w-full"
                  placeholder="输入emoji，如 🎲"
                  value={formData.icon_key}
                  onInput={(e) => setFormData(prev => ({ ...prev, icon_key: e.detail.value }))}
                  maxlength={2}
                />
              </View>

              {/* Name */}
              <View className="mb-5">
                <Text className="block text-sm font-medium text-gray-700 mb-2">桌游名称 *</Text>
                <Input
                  className="w-full"
                  placeholder="请输入桌游名称"
                  value={formData.name}
                  onInput={(e) => setFormData(prev => ({ ...prev, name: e.detail.value }))}
                />
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
                          : 'bg-white border border-gray-200'
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
                          : 'bg-white border border-gray-200'
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
                    <Input
                      className="w-full"
                      type="number"
                      value={String(formData.min_players)}
                      onInput={(e) => setFormData(prev => ({ ...prev, min_players: Number(e.detail.value) }))}
                    />
                  </View>
                  <Text className="text-gray-400">-</Text>
                  <View className="flex-1">
                    <Text className="block text-xs text-gray-500 mb-1">最多</Text>
                    <Input
                      className="w-full"
                      type="number"
                      value={String(formData.max_players)}
                      onInput={(e) => setFormData(prev => ({ ...prev, max_players: Number(e.detail.value) }))}
                    />
                  </View>
                </View>
              </View>

              {/* Duration */}
              <View className="mb-5">
                <Text className="block text-sm font-medium text-gray-700 mb-2">游戏时长（分钟）</Text>
                <View className="flex flex-row items-center gap-4">
                  <View className="flex-1">
                    <Text className="block text-xs text-gray-500 mb-1">最短</Text>
                    <Input
                      className="w-full"
                      type="number"
                      value={String(formData.min_duration)}
                      onInput={(e) => setFormData(prev => ({ ...prev, min_duration: Number(e.detail.value) }))}
                    />
                  </View>
                  <Text className="text-gray-400">-</Text>
                  <View className="flex-1">
                    <Text className="block text-xs text-gray-500 mb-1">最长</Text>
                    <Input
                      className="w-full"
                      type="number"
                      value={String(formData.max_duration)}
                      onInput={(e) => setFormData(prev => ({ ...prev, max_duration: Number(e.detail.value) }))}
                    />
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
                          : 'bg-white border border-gray-200'
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
                <Textarea
                  className="w-full"
                  placeholder="请输入桌游简介"
                  value={formData.intro}
                  onInput={(e) => setFormData(prev => ({ ...prev, intro: e.detail.value }))}
                />
              </View>

              {/* Tips */}
              <View className="mb-5">
                <Text className="block text-sm font-medium text-gray-700 mb-2">小贴士</Text>
                {formData.tips.map((tip, idx) => (
                  <View key={idx} className="flex flex-row items-center gap-2 mb-2">
                      <Input
                        className="flex-1"
                        placeholder={`第 ${idx + 1} 条贴士`}
                        value={tip}
                        onInput={(e) => {
                          const next = [...formData.tips]
                          next[idx] = e.detail.value
                          setFormData(prev => ({ ...prev, tips: next }))
                        }}
                      />
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

              {/* Rules Management */}
              <View className="mb-5">
                <View className="flex flex-row items-center justify-between mb-3">
                  <Text className="block text-sm font-medium text-gray-700">规则管理</Text>
                  <Button size="sm" onClick={handleAddRule}>
                    <Text className="text-xs text-white">+ 添加规则</Text>
                  </Button>
                </View>

                {rules.length === 0 ? (
                  <View className="bg-gray-50 rounded-2xl p-6 flex items-center justify-center">
                    <Text className="text-gray-400 text-sm">暂无规则，点击上方按钮添加</Text>
                  </View>
                ) : (
                  <View className="flex flex-col gap-2">
                    {rules.map((rule, idx) => (
                      <View key={rule.id || `new-${idx}`} className="bg-white border border-gray-100 rounded-xl p-3">
                        <View className="flex flex-row items-center justify-between">
                          <View className="flex flex-row items-center gap-2 flex-1 min-w-0">
                            <View className={`rounded-md px-2 py-1 ${rule.rule_type === 'markdown' ? 'bg-blue-50' : 'bg-amber-50'}`}>
                              <Text className={`text-xs font-medium ${rule.rule_type === 'markdown' ? 'text-blue-600' : 'text-amber-600'}`}>
                                {rule.rule_type === 'markdown' ? 'MD' : '图片'}
                              </Text>
                            </View>
                            <Text className="text-sm font-medium text-gray-900 truncate">{rule.title}</Text>
                            {rule.status === 'converting' && (
                              <View className="rounded-md px-2 py-1 bg-amber-50 border border-amber-200">
                                <Text className="text-xs font-medium text-amber-600">转换中</Text>
                              </View>
                            )}
                            {rule.status === 'failed' && (
                              <View className="rounded-md px-2 py-1 bg-red-50 border border-red-200">
                                <Text className="text-xs font-medium text-red-600">转换失败</Text>
                              </View>
                            )}
                            {rule.rule_type === 'images' && rule.image_urls.length > 0 && (
                              <Text className="text-xs text-gray-400">{rule.image_urls.length}张</Text>
                            )}
                          </View>
                          <View className="flex flex-row items-center gap-1 flex-shrink-0">
                            <View className="px-2 py-1 rounded-lg bg-gray-50" onClick={() => handleMoveRule(idx, 'up')}>
                              <Text className="text-xs text-gray-500">↑</Text>
                            </View>
                            <View className="px-2 py-1 rounded-lg bg-gray-50" onClick={() => handleMoveRule(idx, 'down')}>
                              <Text className="text-xs text-gray-500">↓</Text>
                            </View>
                            <View className="px-2 py-1 rounded-lg bg-blue-50" onClick={() => handleEditRule(rule)}>
                              <Text className="text-xs text-blue-500">编辑</Text>
                            </View>
                            <View className="px-2 py-1 rounded-lg bg-red-50" onClick={() => handleDeleteRule(rule)}>
                              <Text className="text-xs text-red-500">删除</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Rule Editor Modal */}
              {showRuleEditor && editingRule && (
                <View className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50" style={{ width: '100vw', height: '100vh' }}>
                  <View className="w-full bg-white h-full flex flex-col" style={{ maxWidth: '100vw' }}>
                    <View className="px-5 pt-14 pb-4 border-b border-gray-100 flex flex-row items-center justify-between">
                      <Button size="sm" variant="ghost" onClick={() => { setShowRuleEditor(false); setEditingRule(null) }}>
                        <Text className="text-gray-500">取消</Text>
                      </Button>
                      <Text className="font-semibold text-gray-900">{editingRule.id ? '编辑规则' : '添加规则'}</Text>
                      <Button size="sm" onClick={handleSaveRule}>
                        <Text className="text-sm">保存</Text>
                      </Button>
                    </View>

                    <ScrollView className="flex-1 px-5 py-4" scrollY>
                      {/* Rule Title */}
                      <View className="mb-5">
                        <Text className="block text-sm font-medium text-gray-700 mb-2">规则标题</Text>
                        <Input
                          className="w-full"
                          placeholder="例如：游戏准备、计分规则等"
                          value={editingRule.title}
                          onInput={(e) => setEditingRule(prev => prev ? { ...prev, title: e.detail.value } : null)}
                        />
                      </View>

                      {/* Rule Type */}
                      <View className="mb-5">
                        <Text className="block text-sm font-medium text-gray-700 mb-2">规则类型</Text>
                        <View className="flex flex-row gap-2">
                          <View
                            className={`flex-1 rounded-xl p-3 border-2 cursor-pointer ${editingRule.rule_type === 'markdown' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-white'}`}
                            onClick={() => setEditingRule(prev => prev ? { ...prev, rule_type: 'markdown', content: '', image_urls: [] } : null)}
                          >
                            <Text className={`block font-semibold text-sm ${editingRule.rule_type === 'markdown' ? 'text-indigo-700' : 'text-gray-700'}`}>Markdown</Text>
                            <Text className="block text-xs text-gray-500 mt-1">文字+富文本</Text>
                          </View>
                          <View
                            className={`flex-1 rounded-xl p-3 border-2 cursor-pointer ${editingRule.rule_type === 'images' ? 'border-amber-600 bg-amber-50' : 'border-gray-200 bg-white'}`}
                            onClick={() => setEditingRule(prev => prev ? { ...prev, rule_type: 'images', content: '' } : null)}
                          >
                            <Text className={`block font-semibold text-sm ${editingRule.rule_type === 'images' ? 'text-amber-700' : 'text-gray-700'}`}>图片 / PDF</Text>
                            <Text className="block text-xs text-gray-500 mt-1">直接上传或PDF转图</Text>
                          </View>
                        </View>
                      </View>

                      {/* Editor: Markdown */}
                      {editingRule.rule_type === 'markdown' && (
                        <View className="mb-5">
                          <Text className="block text-sm font-medium text-gray-700 mb-2">规则内容（Markdown）</Text>
                          <View className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                            <MarkdownEditor
                              value={editingRule.content}
                              onChange={(value) => setEditingRule(prev => prev ? { ...prev, content: value } : null)}
                              placeholder="请输入规则内容，支持 Markdown 语法..."
                              minHeight={200}
                            />
                          </View>
                        </View>
                      )}

                      {/* Editor: Images */}
                      {editingRule.rule_type === 'images' && (
                        <View className="mb-5">
                          <Text className="block text-sm font-medium text-gray-700 mb-2">规则图片</Text>
                          <View className="flex flex-row flex-wrap gap-2 mb-3">
                            {editingRule.image_urls.map((url, idx) => (
                              <View key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
                                <Image src={url} style={{ width: '100%', height: '100%' }} mode="aspectFill" />
                                <View
                                  className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                                  onClick={() => setEditingRule(prev => prev ? { ...prev, image_urls: prev.image_urls.filter((_, i) => i !== idx) } : null)}
                                >
                                  <Text className="text-white text-xs">×</Text>
                                </View>
                              </View>
                            ))}
                          </View>
                          <View className="flex flex-row gap-2">
                            <Button size="sm" variant="outline" onClick={handleUploadRuleImage} disabled={ruleUploading}>
                              <Text className="text-sm text-gray-700">{ruleUploading ? '上传中...' : '上传图片'}</Text>
                            </Button>
                            <Button
                              size="sm" variant="outline"
                              disabled={ruleUploading}
                              onClick={async () => {
                                try {
                                  const res = await Taro.chooseMessageFile({ count: 1, type: 'file', extension: ['pdf'] })
                                    .catch(() => Taro.chooseImage({ count: 1 }).then(r => ({ tempFiles: [{ path: r.tempFilePaths[0], name: '图片' }] })))
                                  const path = res.tempFiles[0]?.path
                                  if (path) setSelectedPdfPath(path)
                                } catch {}
                              }}
                            >
                              <Text className="text-sm text-gray-700">{selectedPdfPath ? '已选择PDF ✓' : '选择PDF自动转图'}</Text>
                            </Button>
                          </View>
                          <Text className="block text-xs text-gray-400 mt-2">提示：PDF上传后自动拆分为多张图片展示</Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                </View>
              )}

              {/* Sort Order */}
              <View className="mb-5">
                <Text className="block text-sm font-medium text-gray-700 mb-2">排序</Text>
                  <Input
                    className="w-full"
                    type="number"
                    placeholder="数字越小越靠前"
                    value={String(formData.sort_order)}
                    onInput={(e) => setFormData(prev => ({ ...prev, sort_order: Number(e.detail.value) }))}
                  />
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
