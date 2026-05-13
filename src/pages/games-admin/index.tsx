
import { View, Text, ScrollView, Image } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { checkLogin, getCurrentUser } from '@/utils/auth'
import { Network } from '@/network'
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
  difficulty: number
  intro?: string
  beginner_tips?: string
  rules_description?: string
  gameplay_description?: string
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
  difficulty: number
  intro: string
  beginner_tips: string
  rules_description: string
  gameplay_description: string
  sort_order: number
  status: string
}

const TYPE_OPTIONS = ['策略', '益智', '拍卖', '扮演', '经营', '合作', '对抗']
const SCENE_OPTIONS = ['聚会', '团建', '亲子', '情侣', '酒局']
const STATUS_OPTIONS = [
  { value: 'online', label: '上线', desc: '所有人可见' },
  { value: 'preview', label: '预览', desc: '仅管理员可见' },
  { value: 'offline', label: '下线', desc: '仅管理员可见' }
]
const DIFFICULTY_OPTIONS = [
  { value: 1, label: '入门' },
  { value: 2, label: '简单' },
  { value: 3, label: '中等' },
  { value: 4, label: '困难' },
  { value: 5, label: '专家' }
]

const GamesAdminPage: FC = () =&gt; {
  const [games, setGames] = useState&lt;BoardGame[]&gt;([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingGame, setEditingGame] = useState&lt;BoardGame | null&gt;(null)
  const [formData, setFormData] = useState&lt;GameFormData&gt;({
    name: '',
    icon_key: '🎲',
    image_url: '',
    type: [],
    scene: [],
    min_players: 2,
    max_players: 4,
    min_duration: 30,
    max_duration: 60,
    difficulty: 3,
    intro: '',
    beginner_tips: '',
    rules_description: '',
    gameplay_description: '',
    sort_order: 0,
    status: 'online'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() =&gt; {
    if (!checkLogin()) {
      Taro.showModal({
        title: '需要登录',
        content: '请先登录后再使用此功能',
        confirmText: '去登录',
        cancelText: '返回',
        showCancel: true,
        success: (res) =&gt; {
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
        success: () =&gt; {
          Taro.navigateBack()
        }
      })
      return
    }

    loadGames()
  }, [])

  const loadGames = async () =&gt; {
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

  const handleChooseImage = () =&gt; {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) =&gt; {
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
          setFormData(prev =&gt; ({ ...prev, image_url: imageUrl }))
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

  const handleEditGame = async (game: BoardGame) =&gt; {
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
        difficulty: fullGame.difficulty || 3,
        intro: fullGame.intro || '',
        beginner_tips: fullGame.beginner_tips || '',
        rules_description: fullGame.rules_description || '',
        gameplay_description: fullGame.gameplay_description || '',
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

  const handleAddGame = () =&gt; {
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
      difficulty: 3,
      intro: '',
      beginner_tips: '',
      rules_description: '',
      gameplay_description: '',
      sort_order: 0,
      status: 'online'
    })
    setShowModal(true)
  }

  const handleDeleteGame = (game: BoardGame) =&gt; {
    Taro.showModal({
      title: '确认删除',
      content: `确定要删除桌游「${game.name}」吗？`,
      confirmText: '删除',
      cancelText: '取消',
      confirmColor: '#ef4444',
      success: async (res) =&gt; {
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

  const handleSaveGame = async () =&gt; {
    if (!formData.name.trim()) {
      Taro.showToast({ title: '请输入桌游名称', icon: 'none' })
      return
    }
    if (formData.type.length === 0) {
      Taro.showToast({ title: '请至少选择一个类型', icon: 'none' })
      return
    }
    if (formData.min_players &gt; formData.max_players) {
      Taro.showToast({ title: '最少人数不能大于最多人数', icon: 'none' })
      return
    }
    if (formData.min_duration &gt; formData.max_duration) {
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

  const toggleType = (type: string) =&gt; {
    setFormData(prev =&gt; ({
      ...prev,
      type: prev.type.includes(type)
        ? prev.type.filter(t =&gt; t !== type)
        : [...prev.type, type]
    }))
  }

  const toggleScene = (scene: string) =&gt; {
    setFormData(prev =&gt; ({
      ...prev,
      scene: prev.scene.includes(scene)
        ? prev.scene.filter(s =&gt; s !== scene)
        : [...prev.scene, scene]
    }))
  }

  const getDifficultyText = (difficulty: number): string =&gt; {
    const map: Record&lt;number, string&gt; = { 1: '入门', 2: '简单', 3: '中等', 4: '困难', 5: '专家' }
    return map[difficulty] || '中等'
  }

  const getDifficultyColor = (difficulty: number): string =&gt; {
    const map: Record&lt;number, string&gt; = {
      1: '#22c55e', 2: '#84cc16', 3: '#eab308', 4: '#f97316', 5: '#ef4444'
    }
    return map[difficulty] || '#eab308'
  }

  const getStatusText = (status?: string): string =&gt; {
    const map: Record&lt;string, string&gt; = { online: '上线', preview: '预览', offline: '下线' }
    return map[status || 'online'] || '上线'
  }

  const getStatusColor = (status?: string): string =&gt; {
    const map: Record&lt;string, string&gt; = { online: '#22c55e', preview: '#eab308', offline: '#ef4444' }
    return map[status || 'online'] || '#22c55e'
  }

  return (
    &lt;View className="flex flex-col min-h-screen bg-[#f5f5f7]"&gt;
      &lt;View className="px-5 pt-14 pb-4 bg-white border-b border-gray-100"&gt;
        &lt;View className="flex flex-row items-center justify-between"&gt;
          &lt;View className="flex flex-row items-center gap-3"&gt;
            &lt;Button size="sm" variant="ghost" onClick={() =&gt; Taro.navigateBack()}&gt;
              &lt;Text className="text-gray-600"&gt;← 返回&lt;/Text&gt;
            &lt;/Button&gt;
            &lt;Text className="text-xl font-bold text-gray-900"&gt;桌游管理&lt;/Text&gt;
          &lt;/View&gt;
          &lt;Button size="sm" onClick={handleAddGame}&gt;
            &lt;Text className="text-sm"&gt;+ 添加桌游&lt;/Text&gt;
          &lt;/Button&gt;
        &lt;/View&gt;
      &lt;/View&gt;

      &lt;ScrollView className="flex-1 px-4 py-4" scrollY&gt;
        {loading ? (
          &lt;View className="flex items-center justify-center py-20"&gt;
            &lt;Text className="text-gray-400"&gt;加载中...&lt;/Text&gt;
          &lt;/View&gt;
        ) : (
          games.map((game) =&gt; (
            &lt;Card key={game.id} className="border-0 shadow-sm mb-3"&gt;
              &lt;CardContent className="p-4"&gt;
                &lt;View className="flex flex-row items-start justify-between"&gt;
                  &lt;View className="flex flex-row items-start gap-3 flex-1"&gt;
                    {game.image_url ? (
                      &lt;View style={{ width: '60px', height: '60px', borderRadius: '12px', overflow: 'hidden' }}&gt;
                        &lt;Image src={game.image_url} style={{ width: '100%', height: '100%' }} mode="aspectFill" /&gt;
                      &lt;/View&gt;
                    ) : (
                      &lt;Text className="text-4xl"&gt;{game.icon_key || '🎲'}&lt;/Text&gt;
                    )}
                    &lt;View className="flex-1"&gt;
                      &lt;View className="flex flex-row items-center gap-2 mb-1"&gt;
                        &lt;Text className="block font-semibold text-gray-900"&gt;{game.name}&lt;/Text&gt;
                        &lt;View
                          className="rounded-full px-2 py-1"
                          style={{ backgroundColor: `${getStatusColor(game.status)}20` }}
                        &gt;
                          &lt;Text style={{ color: getStatusColor(game.status), fontSize: '11px' }}&gt;
                            {getStatusText(game.status)}
                          &lt;/Text&gt;
                        &lt;/View&gt;
                      &lt;/View&gt;
                      &lt;View className="flex flex-row flex-wrap gap-1 mb-2"&gt;
                        {game.type.slice(0, 3).map((t) =&gt; (
                          &lt;View
                            key={t}
                            className="rounded-full px-2 py-1"
                            style={{ backgroundColor: 'rgba(99,102,241,0.1)' }}
                          &gt;
                            &lt;Text className="text-xs text-indigo-600"&gt;{t}&lt;/Text&gt;
                          &lt;/View&gt;
                        ))}
                        {game.type.length &gt; 3 &amp;&amp; (
                          &lt;Text className="text-xs text-gray-400"&gt;+{game.type.length - 3}&lt;/Text&gt;
                        )}
                      &lt;/View&gt;
                      &lt;View className="flex flex-row items-center gap-4 text-xs text-gray-500"&gt;
                        &lt;Text className="block"&gt;👥 {game.min_players}-{game.max_players}人&lt;/Text&gt;
                        &lt;Text className="block"&gt;⏱️ {game.min_duration || 30}-{game.max_duration || 60}分钟&lt;/Text&gt;
                        &lt;View
                          className="rounded-full px-2 py-1"
                          style={{ backgroundColor: `${getDifficultyColor(game.difficulty)}20` }}
                        &gt;
                          &lt;Text style={{ color: getDifficultyColor(game.difficulty), fontSize: '12px' }}&gt;
                            {getDifficultyText(game.difficulty)}
                          &lt;/Text&gt;
                        &lt;/View&gt;
                      &lt;/View&gt;
                    &lt;/View&gt;
                  &lt;/View&gt;
                  &lt;View className="flex flex-row gap-2"&gt;
                    &lt;Button size="sm" variant="ghost" onClick={() =&gt; handleEditGame(game)}&gt;
                      &lt;Text className="text-indigo-600 text-sm"&gt;编辑&lt;/Text&gt;
                    &lt;/Button&gt;
                    &lt;Button size="sm" variant="ghost" onClick={() =&gt; handleDeleteGame(game)}&gt;
                      &lt;Text className="text-red-600 text-sm"&gt;删除&lt;/Text&gt;
                    &lt;/Button&gt;
                  &lt;/View&gt;
                &lt;/View&gt;
              &lt;/CardContent&gt;
            &lt;/Card&gt;
          ))
        )}
        {!loading &amp;&amp; games.length === 0 &amp;&amp; (
          &lt;View className="flex flex-col items-center justify-center py-20"&gt;
            &lt;Text className="text-4xl mb-3"&gt;🎲&lt;/Text&gt;
            &lt;Text className="text-gray-400 text-sm"&gt;暂无桌游&lt;/Text&gt;
          &lt;/View&gt;
        )}
      &lt;/ScrollView&gt;

      {showModal &amp;&amp; (
        &lt;View className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50"&gt;
          &lt;View className="w-full bg-white rounded-t-2xl max-h-[85vh]"&gt;
            &lt;View className="px-5 py-4 border-b border-gray-100 flex flex-row items-center justify-between"&gt;
              &lt;Button size="sm" variant="ghost" onClick={() =&gt; setShowModal(false)}&gt;
                &lt;Text className="text-gray-500"&gt;取消&lt;/Text&gt;
              &lt;/Button&gt;
              &lt;Text className="font-semibold text-gray-900"&gt;
                {editingGame ? '编辑桌游' : '添加桌游'}
              &lt;/Text&gt;
              &lt;Button size="sm" onClick={handleSaveGame} disabled={saving}&gt;
                &lt;Text className="text-sm"&gt;{saving ? '保存中...' : '保存'}&lt;/Text&gt;
              &lt;/Button&gt;
            &lt;/View&gt;

            &lt;ScrollView className="px-5 py-4 max-h-[70vh]" scrollY&gt;
              &lt;View className="mb-4"&gt;
                &lt;Text className="block text-sm font-medium text-gray-700 mb-2"&gt;状态&lt;/Text&gt;
                &lt;View className="flex flex-row gap-2"&gt;
                  {STATUS_OPTIONS.map((opt) =&gt; (
                    &lt;View
                      key={opt.value}
                      className={`flex-1 rounded-xl p-3 border-2 cursor-pointer ${
                        formData.status === opt.value
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                      onClick={() =&gt; setFormData(prev =&gt; ({ ...prev, status: opt.value }))}
                    &gt;
                      &lt;Text className={`block font-semibold text-sm ${
                        formData.status === opt.value ? 'text-indigo-700' : 'text-gray-700'
                      }`}
                      &gt;
                        {opt.label}
                      &lt;/Text&gt;
                      &lt;Text className="block text-xs text-gray-500 mt-1"&gt;{opt.desc}&lt;/Text&gt;
                    &lt;/View&gt;
                  ))}
                &lt;/View&gt;
              &lt;/View&gt;

              &lt;View className="mb-4"&gt;
                &lt;Text className="block text-sm font-medium text-gray-700 mb-2"&gt;图片&lt;/Text&gt;
                &lt;View className="flex flex-row items-center gap-4"&gt;
                  &lt;View style={{ width: '80px', height: '80px', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#f3f4f6' }}&gt;
                    {formData.image_url ? (
                      &lt;Image src={formData.image_url} style={{ width: '100%', height: '100%' }} mode="aspectFill" /&gt;
                    ) : (
                      &lt;View className="flex items-center justify-center h-full"&gt;
                        &lt;Text className="text-3xl"&gt;{formData.icon_key || '🎲'}&lt;/Text&gt;
                      &lt;/View&gt;
                    )}
                  &lt;/View&gt;
                  &lt;Button size="sm" onClick={handleChooseImage}&gt;
                    &lt;Text className="text-sm"&gt;选择图片&lt;/Text&gt;
                  &lt;/Button&gt;
                &lt;/View&gt;
              &lt;/View&gt;

              &lt;View className="mb-4"&gt;
                &lt;Text className="block text-sm font-medium text-gray-700 mb-2"&gt;备用emoji&lt;/Text&gt;
                &lt;View className="bg-gray-50 rounded-xl px-4 py-3"&gt;
                  &lt;Input
                    className="w-full bg-transparent"
                    placeholder="输入emoji，如 🎲"
                    value={formData.icon_key}
                    onInput={(e) =&gt; setFormData(prev =&gt; ({ ...prev, icon_key: e.detail.value }))}
                    maxlength={2}
                  /&gt;
                &lt;/View&gt;
              &lt;/View&gt;

              &lt;View className="mb-4"&gt;
                &lt;Text className="block text-sm font-medium text-gray-700 mb-2"&gt;桌游名称 *&lt;/Text&gt;
                &lt;View className="bg-gray-50 rounded-xl px-4 py-3"&gt;
                  &lt;Input
                    className="w-full bg-transparent"
                    placeholder="请输入桌游名称"
                    value={formData.name}
                    onInput={(e) =&gt; setFormData(prev =&gt; ({ ...prev, name: e.detail.value }))}
                  /&gt;
                &lt;/View&gt;
              &lt;/View&gt;

              &lt;View className="mb-4"&gt;
                &lt;Text className="block text-sm font-medium text-gray-700 mb-2"&gt;类型 *&lt;/Text&gt;
                &lt;View className="flex flex-row flex-wrap gap-2"&gt;
                  {TYPE_OPTIONS.map((type) =&gt; (
                    &lt;View
                      key={type}
                      className={`rounded-full px-3 py-2 cursor-pointer ${
                        formData.type.includes(type)
                          ? 'bg-indigo-600'
                          : 'bg-gray-100'
                      }`}
                      onClick={() =&gt; toggleType(type)}
                    &gt;
                      &lt;Text className={`text-sm ${
                        formData.type.includes(type)
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}
                      &gt;
                        {type}
                      &lt;/Text&gt;
                    &lt;/View&gt;
                  ))}
                &lt;/View&gt;
              &lt;/View&gt;

              &lt;View className="mb-4"&gt;
                &lt;Text className="block text-sm font-medium text-gray-700 mb-2"&gt;场景&lt;/Text&gt;
                &lt;View className="flex flex-row flex-wrap gap-2"&gt;
                  {SCENE_OPTIONS.map((scene) =&gt; (
                    &lt;View
                      key={scene}
                      className={`rounded-full px-3 py-2 cursor-pointer ${
                        formData.scene.includes(scene)
                          ? 'bg-purple-600'
                          : 'bg-gray-100'
                      }`}
                      onClick={() =&gt; toggleScene(scene)}
                    &gt;
                      &lt;Text className={`text-sm ${
                        formData.scene.includes(scene)
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}
                      &gt;
                        {scene}
                      &lt;/Text&gt;
                    &lt;/View&gt;
                  ))}
                &lt;/View&gt;
              &lt;/View&gt;

              &lt;View className="mb-4"&gt;
                &lt;Text className="block text-sm font-medium text-gray-700 mb-2"&gt;游戏人数&lt;/Text&gt;
                &lt;View className="flex flex-row items-center gap-4"&gt;
                  &lt;View className="flex-1"&gt;
                    &lt;Text className="block text-xs text-gray-500 mb-1"&gt;最少&lt;/Text&gt;
                    &lt;View className="bg-gray-50 rounded-xl px-4 py-3"&gt;
                      &lt;Input
                        className="w-full bg-transparent"
                        type="number"
                        value={String(formData.min_players)}
                        onInput={(e) =&gt; setFormData(prev =&gt; ({ ...prev, min_players: Number(e.detail.value) }))}
                      /&gt;
                    &lt;/View&gt;
                  &lt;/View&gt;
                  &lt;Text className="text-gray-400"&gt;-&lt;/Text&gt;
                  &lt;View className="flex-1"&gt;
                    &lt;Text className="block text-xs text-gray-500 mb-1"&gt;最多&lt;/Text&gt;
                    &lt;View className="bg-gray-50 rounded-xl px-4 py-3"&gt;
                      &lt;Input
                        className="w-full bg-transparent"
                        type="number"
                        value={String(formData.max_players)}
                        onInput={(e) =&gt; setFormData(prev =&gt; ({ ...prev, max_players: Number(e.detail.value) }))}
                      /&gt;
                    &lt;/View&gt;
                  &lt;/View&gt;
                &lt;/View&gt;
              &lt;/View&gt;

              &lt;View className="mb-4"&gt;
                &lt;Text className="block text-sm font-medium text-gray-700 mb-2"&gt;游戏时长（分钟）&lt;/Text&gt;
                &lt;View className="flex flex-row items-center gap-4"&gt;
                  &lt;View className="flex-1"&gt;
                    &lt;Text className="block text-xs text-gray-500 mb-1"&gt;最短&lt;/Text&gt;
                    &lt;View className="bg-gray-50 rounded-xl px-4 py-3"&gt;
                      &lt;Input
                        className="w-full bg-transparent"
                        type="number"
                        value={String(formData.min_duration)}
                        onInput={(e) =&gt; setFormData(prev =&gt; ({ ...prev, min_duration: Number(e.detail.value) }))}
                      /&gt;
                    &lt;/View&gt;
                  &lt;/View&gt;
                  &lt;Text className="text-gray-400"&gt;-&lt;/Text&gt;
                  &lt;View className="flex-1"&gt;
                    &lt;Text className="block text-xs text-gray-500 mb-1"&gt;最长&lt;/Text&gt;
                    &lt;View className="bg-gray-50 rounded-xl px-4 py-3"&gt;
                      &lt;Input
                        className="w-full bg-transparent"
                        type="number"
                        value={String(formData.max_duration)}
                        onInput={(e) =&gt; setFormData(prev =&gt; ({ ...prev, max_duration: Number(e.detail.value) }))}
                      /&gt;
                    &lt;/View&gt;
                  &lt;/View&gt;
                &lt;/View&gt;
              &lt;/View&gt;

              &lt;View className="mb-4"&gt;
                &lt;Text className="block text-sm font-medium text-gray-700 mb-2"&gt;难度&lt;/Text&gt;
                &lt;View className="flex flex-row flex-wrap gap-2"&gt;
                  {DIFFICULTY_OPTIONS.map((opt) =&gt; (
                    &lt;View
                      key={opt.value}
                      className={`rounded-full px-3 py-2 cursor-pointer ${
                        formData.difficulty === opt.value
                          ? 'bg-orange-600'
                          : 'bg-gray-100'
                      }`}
                      onClick={() =&gt; setFormData(prev =&gt; ({ ...prev, difficulty: opt.value }))}
                    &gt;
                      &lt;Text className={`text-sm ${
                        formData.difficulty === opt.value
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}
                      &gt;
                        {opt.label}
                      &lt;/Text&gt;
                    &lt;/View&gt;
                  ))}
                &lt;/View&gt;
              &lt;/View&gt;

              &lt;View className="mb-4"&gt;
                &lt;Text className="block text-sm font-medium text-gray-700 mb-2"&gt;简介&lt;/Text&gt;
                &lt;View className="bg-gray-50 rounded-xl px-4 py-3"&gt;
                  &lt;Input
                    className="w-full bg-transparent"
                    placeholder="请输入桌游简介"
                    value={formData.intro}
                    onInput={(e) =&gt; setFormData(prev =&gt; ({ ...prev, intro: e.detail.value }))}
                  /&gt;
                &lt;/View&gt;
              &lt;/View&gt;

              &lt;View className="mb-4"&gt;
                &lt;Text className="block text-sm font-medium text-gray-700 mb-2"&gt;新手提示&lt;/Text&gt;
                &lt;View className="bg-gray-50 rounded-xl px-4 py-3"&gt;
                  &lt;Textarea
                    className="w-full bg-transparent"
                    placeholder="请输入新手提示"
                    value={formData.beginner_tips}
                    onInput={(e) =&gt; setFormData(prev =&gt; ({ ...prev, beginner_tips: e.detail.value }))}
                  /&gt;
                &lt;/View&gt;
              &lt;/View&gt;

              &lt;View className="mb-4"&gt;
                &lt;Text className="block text-sm font-medium text-gray-700 mb-2"&gt;规则描述&lt;/Text&gt;
                &lt;View className="bg-gray-50 rounded-xl px-4 py-3"&gt;
                  &lt;Textarea
                    className="w-full bg-transparent"
                    placeholder="请输入桌游规则"
                    value={formData.rules_description}
                    onInput={(e) =&gt; setFormData(prev =&gt; ({ ...prev, rules_description: e.detail.value }))}
                  /&gt;
                &lt;/View&gt;
              &lt;/View&gt;

              &lt;View className="mb-4"&gt;
                &lt;Text className="block text-sm font-medium text-gray-700 mb-2"&gt;玩法描述&lt;/Text&gt;
                &lt;View className="bg-gray-50 rounded-xl px-4 py-3"&gt;
                  &lt;Textarea
                    className="w-full bg-transparent"
                    placeholder="请输入桌游玩法"
                    value={formData.gameplay_description}
                    onInput={(e) =&gt; setFormData(prev =&gt; ({ ...prev, gameplay_description: e.detail.value }))}
                  /&gt;
                &lt;/View&gt;
              &lt;/View&gt;

              &lt;View className="mb-4"&gt;
                &lt;Text className="block text-sm font-medium text-gray-700 mb-2"&gt;排序&lt;/Text&gt;
                &lt;View className="bg-gray-50 rounded-xl px-4 py-3"&gt;
                  &lt;Input
                    className="w-full bg-transparent"
                    type="number"
                    placeholder="数字越小越靠前"
                    value={String(formData.sort_order)}
                    onInput={(e) =&gt; setFormData(prev =&gt; ({ ...prev, sort_order: Number(e.detail.value) }))}
                  /&gt;
                &lt;/View&gt;
              &lt;/View&gt;
            &lt;/ScrollView&gt;
          &lt;/View&gt;
        &lt;/View&gt;
      )}
    &lt;/View&gt;
  )
}

export default GamesAdminPage
