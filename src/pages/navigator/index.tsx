import { View, Text, RichText, Image } from '@tarojs/components'
import Taro, { useDidShow, useShareAppMessage } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { checkLogin, getCurrentUser } from '@/utils/auth'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { markdownToRichText } from '@/lib/markdown'
import {
  Play, Plus, X, User, Dices, Timer,
  Hand, Calculator, BookOpen, ChevronRight,
  Trophy, RotateCcw, Minus, Send, Sparkles, ChessKing, ArrowLeft,
  Camera, Trash2, Image as ImageIcon
} from 'lucide-react-taro'
import type { FC } from 'react'

interface BoardGame {
  id: number
  name: string
  min_players: number
  max_players: number
  duration: number
  icon_bg: string
  icon_color: string
  hero_bg: string
  rules?: string
  tips: string[]
  scoring_config: Record<string, unknown>
}

interface Player {
  name: string
  score: number
  faction?: string
  customScores?: Record<string, number>
}

interface GameSession {
  id: number
  session_name: string
  game_id: number | null
  game?: BoardGame
  status: string
  players: string[]
  winner: string | null
  scoring_snapshot: Player[] | null
  duration: number | null
  created_at: string
  user_id: number | null
}

interface Photo {
  id: number
  session_id: number
  user_id: number
  file_key: string
  url: string
  caption: string | null
  created_at: string
}

type Phase = 'setup' | 'playing' | 'finished' | 'viewing'

const TOOL_ITEMS = [
  { key: 'finger', label: '选人', icon: <Hand size={20} color="#ef4444" />, path: '/pages/finger-picker/index' },
  { key: 'dice', label: '骰子', icon: <Dices size={20} color="#6366f1" />, path: '/pages/dice/index' },
  { key: 'timer', label: '计时', icon: <Timer size={20} color="#10b981" />, path: '/pages/timer/index' },
]

const NavigatorPage: FC = () => {
  const [phase, setPhase] = useState<Phase>('setup')
  const [game, setGame] = useState<BoardGame | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [newPlayerName, setNewPlayerName] = useState('')
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [showFinishDialog, setShowFinishDialog] = useState(false)
  const [scoringStep, setScoringStep] = useState(1)
  const [session, setSession] = useState<GameSession | null>(null)
  const [rulesExpanded, setRulesExpanded] = useState(false)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [showPhotoActions, setShowPhotoActions] = useState(false)
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const isMiniApp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP || Taro.getEnv() === Taro.ENV_TYPE.TT

  // 切换收藏
  const toggleFavorite = async () => {
    if (!sessionId || !session) return
    if (!checkLogin()) {
      Taro.showModal({
        title: '需要登录',
        content: '请先登录后收藏对局',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            Taro.setStorageSync('pendingFavoriteSessionId', sessionId)
            Taro.switchTab({ url: '/pages/profile/index' })
          }
        },
      })
      return
    }
    try {
      if (isFavorited) {
        await Network.request({ url: `/api/sessions/${sessionId}/favorite`, method: 'DELETE' })
        setIsFavorited(false)
        Taro.showToast({ title: '已取消收藏', icon: 'none' })
      } else {
        await Network.request({ url: `/api/sessions/${sessionId}/favorite`, method: 'POST' })
        setIsFavorited(true)
        Taro.showToast({ title: '已收藏', icon: 'success' })
      }
    } catch (e) {
      console.error('[Navigator] toggleFavorite error:', e)
      Taro.showToast({ title: '操作失败', icon: 'none' })
    }
  }

  // 分享配置
  useShareAppMessage(() => ({
    title: session?.session_name || game?.name || '精彩对局',
    path: `/pages/navigator/index?sessionId=${session?.id}`,
  }))

  const pendingFavoriteSessionId = Taro.getStorageSync('pendingFavoriteSessionId')
  if (pendingFavoriteSessionId && checkLogin()) {
    Taro.removeStorageSync('pendingFavoriteSessionId')
    if (pendingFavoriteSessionId == sessionId && !isFavorited) {
      toggleFavorite()
    }
  }

  useEffect(() => {
    if (!checkLogin()) {
      Taro.showModal({
        title: '需要登录',
        content: '请先登录后再继续',
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
    const instance = Taro.getCurrentInstance()
    const gameId = instance?.router?.params?.gameId
    const sessionIdParam = instance?.router?.params?.sessionId
    
    if (sessionIdParam) {
      // 查看历史对局详情
      fetchSession(Number(sessionIdParam))
    } else if (gameId) {
      // 开始新对局
      fetchGame(Number(gameId))
    }
  }, [])

  useEffect(() => {
    if (!timerRunning) return
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [timerRunning])

  // 自动保存：玩家分数变化时防抖保存
  useEffect(() => {
    if (phase !== 'playing' || !sessionId || players.length === 0) return
    const timeoutId = setTimeout(() => {
      saveSessionProgress()
    }, 2500)
    return () => clearTimeout(timeoutId)
  }, [players])

  const saveSessionProgress = async () => {
    if (!sessionId) return
    try {
      await Network.request({
        url: `/api/sessions/${sessionId}`,
        method: 'PUT',
        data: {
          players: players.map((p) => p.name),
          scoring_snapshot: players,
          duration_seconds: elapsedSeconds,
        },
      })
      console.log('[NavigatorPage] saveSessionProgress success')
    } catch (err) {
      console.error('[NavigatorPage] saveSessionProgress error:', err)
    }
  }

  const fetchGame = async (id: number) => {
    try {
      const res = await Network.request({ url: `/api/games/${id}` })
      console.log('[NavigatorPage] fetchGame response:', res.data)
      const gameData = res.data?.data
      if (gameData) {
        setGame(gameData)
      } else {
        Taro.showToast({ title: '获取游戏信息失败', icon: 'none' })
      }
    } catch (err) {
      console.error('[NavigatorPage] fetchGame error:', err)
      Taro.showToast({ title: '网络请求失败', icon: 'none' })
    }
  }

  const fetchSession = async (id: number) => {
    try {
      const res = await Network.request({ url: `/api/sessions/${id}` })
      console.log('[NavigatorPage] fetchSession response:', res.data)
      const sessionData = res.data?.data
      if (sessionData) {
        setSession(sessionData)
        setSessionId(sessionData.id)
        if (sessionData.game) {
          setGame(sessionData.game)
        }
        if (sessionData.scoring_snapshot) {
          setPlayers(sessionData.scoring_snapshot)
        } else if (sessionData.players) {
          setPlayers(sessionData.players.map((name: string) => ({ name, score: 0 })))
        }
        if (sessionData.duration && sessionData.status !== 'playing') {
          setElapsedSeconds(sessionData.duration)
        }
        // 如果是进行中的对局，基于 created_at 计算已过秒数
        if (sessionData.status === 'playing') {
          const startTime = sessionData.created_at ? new Date(sessionData.created_at).getTime() : Date.now()
          setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000))
          setPhase('playing')
          setTimerRunning(true)
        } else {
          // 已结束或已取消的对局，只读查看
          setPhase('viewing')
        }
        // 加载该对局的照片
        fetchPhotos(sessionData.id)
      } else {
        Taro.showToast({ title: '获取对局信息失败', icon: 'none' })
      }
    } catch (err) {
      console.error('[NavigatorPage] fetchSession error:', err)
      Taro.showToast({ title: '网络请求失败', icon: 'none' })
    }
  }

  const fetchPhotos = async (sid: number) => {
    try {
      const res = await Network.request({ url: `/api/sessions/${sid}/photos` })
      console.log('[NavigatorPage] fetchPhotos response:', res.data)
      const list = res.data?.data
      if (Array.isArray(list)) {
        setPhotos(list)
      }
    } catch (err) {
      console.error('[NavigatorPage] fetchPhotos error:', err)
    }
  }

  const handleTakePhoto = () => {
    setShowPhotoActions(false)
    if (!sessionId) return
    Taro.chooseImage({
      count: 1,
      sourceType: ['camera'],
      success: (res) => uploadPhotos(res.tempFilePaths),
      fail: (err) => console.error('[NavigatorPage] 拍照失败:', err),
    })
  }

  const handlePickFromAlbum = () => {
    setShowPhotoActions(false)
    if (!sessionId) return
    Taro.chooseImage({
      count: 9,
      sourceType: ['album'],
      success: (res) => uploadPhotos(res.tempFilePaths),
      fail: (err) => console.error('[NavigatorPage] 选图失败:', err),
    })
  }

  const uploadPhotos = async (filePaths: string[]) => {
    if (!sessionId || filePaths.length === 0) return
    setUploading(true)
    let successCount = 0
    let failCount = 0
    for (let i = 0; i < filePaths.length; i++) {
      try {
        Taro.showLoading({ title: `正在上传 ${i + 1}/${filePaths.length}`, mask: true })
        const uploadRes = await Network.uploadFile({
          url: `/api/sessions/${sessionId}/photos/upload`,
          filePath: filePaths[i],
          name: 'file',
        })
        console.log('[NavigatorPage] upload response:', uploadRes.data)
        const parsed = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data
        const photoData = parsed?.data
        if (photoData) {
          setPhotos((prev) => [photoData, ...prev])
          successCount++
        } else {
          failCount++
        }
      } catch (err) {
        console.error('[NavigatorPage] uploadPhoto error for file', i, err)
        failCount++
      } finally {
        Taro.hideLoading()
      }
    }
    setUploading(false)
    if (successCount > 0) {
      const msg = failCount > 0 ? `成功${successCount}张，${failCount}张失败` : `成功上传${successCount}张照片`
      Taro.showToast({ title: msg, icon: failCount > 0 ? 'none' : 'success' })
    } else {
      Taro.showToast({ title: '上传失败，请重试', icon: 'none' })
    }
  }

  const deletePhoto = async (photoId: number) => {
    Taro.showModal({
      title: '删除照片',
      content: '确定要删除这张照片吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await Network.request({
              url: `/api/sessions/${sessionId}/photos/${photoId}`,
              method: 'DELETE',
            })
            setPhotos((prev) => prev.filter((p) => p.id !== photoId))
            setPreviewPhoto(null)
            Taro.showToast({ title: '已删除', icon: 'success' })
          } catch (err) {
            console.error('[NavigatorPage] deletePhoto error:', err)
            Taro.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      },
    })
  }

  const addPlayer = () => {
    if (!newPlayerName.trim() || players.length >= 12) return
    setPlayers([...players, { name: newPlayerName.trim(), score: 0 }])
    setNewPlayerName('')
  }

  const removePlayer = (idx: number) => {
    setPlayers(players.filter((_, i) => i !== idx))
  }

  const startGame = async () => {
    if (!game || players.length < game.min_players) {
      Taro.showToast({ title: `至少需要${game?.min_players || 0}名玩家`, icon: 'none' })
      return
    }
    try {
      const currentUser = getCurrentUser()
      const res = await Network.request({
        url: '/api/sessions',
        method: 'POST',
        data: {
          user_id: currentUser?.id,
          game_id: game.id,
          sessionName: `${game.name} 对局`,
          players: players.map((p) => p.name),
        },
      })
      console.log('[NavigatorPage] createSession response:', res.data)
      const id = res.data?.data?.id
      if (id) {
        setSessionId(id)
        fetchPhotos(id)
      }
      setElapsedSeconds(0)
      setPhase('playing')
      setTimerRunning(true)
    } catch (err) {
      console.error('[NavigatorPage] createSession error:', err)
      setElapsedSeconds(0)
      setPhase('playing')
      setTimerRunning(true)
    }
  }

  const changeScore = (idx: number, delta: number) => {
    setPlayers(players.map((p, i) => (i === idx ? { ...p, score: p.score + delta } : p)))
  }

  const finishGame = async () => {
    setTimerRunning(false)
    if (sessionId) {
      try {
        const sorted = [...players].sort((a, b) => b.score - a.score)
        await Network.request({
          url: `/api/sessions/${sessionId}/finish`,
          method: 'POST',
          data: {
            winner: sorted[0]?.name,
            scoring_snapshot: players.map((p) => ({ name: p.name, score: p.score })),
            duration_seconds: elapsedSeconds,
          },
        })
      } catch (err) {
        console.error('[NavigatorPage] finishSession error:', err)
      }
    }
    setPhase('finished')
    setShowFinishDialog(false)
  }

  const askAI = async () => {
    if (!aiQuestion.trim() || !game) return
    setAiLoading(true)
    setAiAnswer('')
    try {
      const res = await Network.request({
        url: '/api/ai/chat',
        method: 'POST',
        data: { game_id: game.id, question: aiQuestion },
      })
      console.log('[NavigatorPage] askAI response:', res.data)
      const answer = res.data?.data?.answer
      if (answer) {
        setAiAnswer(answer)
      } else {
        setAiAnswer('暂无回答，请换个问题试试')
      }
    } catch (err) {
      console.error('[NavigatorPage] askAI error:', err)
      setAiAnswer('AI 回答失败，请稍后重试')
    } finally {
      setAiLoading(false)
    }
  }

  const goToTool = (path: string) => {
    // 跳转计分器时，把当前玩家和分数写入 storage 供计分器读取
    if (path.includes('scorer') && players.length > 0) {
      Taro.setStorageSync('scorer_session', JSON.stringify({
        sessionId,
        players: players.map((p) => ({ name: p.name, score: p.score })),
      }))
    }
    Taro.navigateTo({ url: path })
  }

  // 从计分器返回后同步最新分数
  useDidShow(() => {
    if (phase !== 'playing') return
    try {
      const raw = Taro.getStorageSync('scorer_session')
      if (!raw) return
      const data = JSON.parse(raw)
      if (data.sessionId !== sessionId) return
      // 只同步分数，玩家顺序保持不变
      setPlayers((prev) =>
        prev.map((p) => {
          const updated = data.players.find((dp: { name: string; score: number }) => dp.name === p.name)
          return updated ? { ...p, score: updated.score } : p
        })
      )
      Taro.removeStorageSync('scorer_session')
    } catch {
      // ignore
    }
  })

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'playing': return '进行中'
      case 'finished': return '已结束'
      case 'cancelled': return '已取消'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'playing': return '#22c55e'
      case 'finished': return '#3b82f6'
      case 'cancelled': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
  const rankColors = ['#eab308', '#9ca3af', '#b45309']

  // =================== VIEWING PHASE (查看历史对局) ===================
  if (phase === 'viewing') {
    return (
      <View className="flex flex-col min-h-screen bg-background">
        {/* 顶部信息栏 */}
        <View
          className="px-4 pt-14 pb-3"
          style={{ background: game?.hero_bg || 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
        >
          <View className="flex flex-row items-center justify-between">
            <View className="flex-1 min-w-0">
              <View className="flex flex-row items-center gap-2">
                <View className="cursor-pointer" onClick={() => Taro.navigateBack()}>
                  <ArrowLeft size={20} color="#fff" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="block text-base font-bold text-white truncate">{session?.session_name || game?.name || '对局详情'}</Text>
                  <Text className="block text-xs text-white text-opacity-70 mt-1">
                    {session?.created_at ? formatDate(session.created_at) : ''}
                  </Text>
                </View>
              </View>
            </View>
            {session && (
              <View className="flex flex-row items-center gap-2 rounded-full px-3 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <View className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(session.status) }} />
                <Text className="block text-sm text-white font-mono">{getStatusText(session.status)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* 核心内容区 */}
        <View className="flex-1 px-4 pt-4 pb-4 overflow-y-auto">
          {/* 对局信息 */}
          {session && (
            <View className="mb-5">
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <View className="flex flex-col gap-3">
                    <View className="flex flex-row items-center justify-between">
                      <Text className="block text-sm text-muted-foreground">时长</Text>
                      <Text className="block text-sm font-semibold text-foreground">
                        {session.duration ? formatTime(session.duration) : '-'}
                      </Text>
                    </View>
                    {session.winner && (
                      <View className="flex flex-row items-center justify-between">
                        <Text className="block text-sm text-muted-foreground">胜者</Text>
                        <View className="flex flex-row items-center gap-1">
                          <Trophy size={14} color="#eab308" />
                          <Text className="block text-sm font-semibold text-amber-600">{session.winner}</Text>
                        </View>
                      </View>
                    )}
                    {session.players && session.players.length > 0 && (
                      <View className="flex flex-row items-center justify-between">
                        <Text className="block text-sm text-muted-foreground">参与者</Text>
                        <Text className="block text-sm font-semibold text-foreground">{session.players.length}人</Text>
                      </View>
                    )}
                  </View>
                </CardContent>
              </Card>
            </View>
          )}

          {/* 计分板 */}
          {players.length > 0 && (
            <View className="mb-5">
              <View className="flex flex-row items-center gap-2 mb-3">
                <View className="w-1 h-4 rounded-full bg-violet-500" />
                <Calculator size={16} color="#8b5cf6" />
                <Text className="block text-sm font-bold text-foreground">最终得分</Text>
              </View>
              <View className="flex flex-col gap-2">
                {sortedPlayers.map((player, rank) => (
                  <Card key={player.name} className="shadow-sm">
                    <CardContent className="flex flex-row items-center p-3 gap-3">
                      <View
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: rank < 3 ? rankColors[rank] : '#e5e7eb' }}
                      >
                        {rank === 0 ? (
                          <Trophy size={14} color="#fff" />
                        ) : (
                          <Text className="text-xs font-bold text-white">{rank + 1}</Text>
                        )}
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text className="block text-sm font-semibold text-foreground truncate">{player.name}</Text>
                        <Text className="block text-2xl font-bold text-primary mt-1">{player.score}</Text>
                      </View>
                    </CardContent>
                  </Card>
                ))}
              </View>
            </View>
          )}

          {/* 规则速查 */}
          {game?.rules && (
            <View className="mb-5">
              <View
                className="flex flex-row items-center justify-between mb-3"
                onClick={() => setRulesExpanded(v => !v)}
              >
                <View className="flex flex-row items-center gap-2">
                  <View className="w-1 h-4 rounded-full bg-blue-500" />
                  <BookOpen size={16} color="#3b82f6" />
                  <Text className="block text-sm font-bold text-foreground">规则速查</Text>
                </View>
                <ChevronRight size={16} color="#9ca3af" style={{ transform: rulesExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }} />
              </View>
              {rulesExpanded && (
                <Card className="shadow-sm">
                  <CardContent className="p-3">
                    <RichText nodes={markdownToRichText(game.rules)} />
                  </CardContent>
                </Card>
              )}
            </View>
          )}

          {/* 精彩瞬间 - 照片墙 */}
          {photos.length > 0 && (
            <View className="mb-5">
              <View className="flex flex-row items-center gap-2 mb-3">
                <View className="w-1 h-4 rounded-full bg-rose-500" />
                <ImageIcon size={16} color="#f43f5e" />
                <Text className="block text-sm font-bold text-foreground">精彩瞬间</Text>
                <Text className="block text-xs text-muted-foreground ml-auto">{photos.length}张</Text>
              </View>
              <View className="flex flex-row flex-wrap gap-1.5">
                {photos.map((photo) => (
                  <View
                    key={photo.id}
                    className="w-[31%] aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer"
                    onClick={() => setPreviewPhoto(photo.url)}
                  >
                    <Image className="w-full h-full" src={photo.url} mode="aspectFill" />
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* 底部操作栏 */}
        <View
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'row',
            gap: '12px',
            padding: '12px 16px',
            backgroundColor: '#fff',
            borderTop: '1px solid #e5e7eb',
            zIndex: 100,
          }}
        >
          <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => Taro.navigateBack()}>
            <View className="flex flex-row items-center gap-1">
              <ArrowLeft size={14} color="#6b7280" />
              <Text>返回</Text>
            </View>
          </Button>
          <Button
            className="flex-1 rounded-xl h-11"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            onClick={() => {
              Taro.navigateTo({ url: `/pages/poster/index?sessionId=${session?.id}` })
            }}
          >
            <View className="flex flex-row items-center gap-1">
              <ImageIcon size={14} color="#fff" />
              <Text className="text-white">生成海报</Text>
            </View>
          </Button>
        </View>

        <View className="h-16" />
      </View>
    )
  }

  // =================== SETUP PHASE ===================
  if (phase === 'setup') {
    return (
      <View className="flex flex-col min-h-screen bg-gradient-to-b from-indigo-50 to-background">
        {/* Header */}
        <View className="px-4 pt-14 pb-6">
          <View className="flex flex-row items-center gap-3">
            <View className="cursor-pointer" onClick={() => Taro.navigateBack()}>
              <ArrowLeft size={20} color="#111827" />
            </View>
            <View className="flex-1">
              <Text className="block text-2xl font-bold text-foreground">对局设置</Text>
              <Text className="block text-sm text-muted-foreground mt-1">选择桌游、添加玩家，准备开始</Text>
            </View>
          </View>
        </View>

        {/* 游戏信息 Hero Card */}
        {game && (
          <View className="px-4 mb-5">
            <View
              className="rounded-2xl p-5 shadow-lg"
              style={{ background: game.hero_bg || 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
            >
              <View className="flex flex-row items-center gap-3">
                <View
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  <Text className="text-2xl font-bold text-white">{game.name.charAt(0)}</Text>
                </View>
                <View className="flex-1">
                  <Text className="block text-lg font-bold text-white">{game.name}</Text>
                  <View className="flex flex-row items-center gap-3 mt-1">
                    <View className="flex flex-row items-center gap-1">
                      <User size={12} color="rgba(255,255,255,0.8)" />
                      <Text className="text-xs text-white text-opacity-80">{game.min_players}-{game.max_players}人</Text>
                    </View>
                    <View className="flex flex-row items-center gap-1">
                      <Timer size={12} color="rgba(255,255,255,0.8)" />
                      <Text className="text-xs text-white text-opacity-80">{game.duration}分钟</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {!game && (
          <View className="px-4 mb-5">
            <View className="rounded-2xl border-2 border-dashed border-muted p-8 flex flex-col items-center">
              <ChessKing size={40} color="#9ca3af" />
              <Text className="block text-sm text-muted-foreground mt-2">请从桌游馆选择一个桌游开始</Text>
            </View>
          </View>
        )}

        {/* 添加玩家 */}
        <View className="px-4 mb-5">
          <View className="flex flex-row items-center gap-2 mb-3">
            <View className="w-1 h-4 rounded-full bg-primary" />
            <Text className="block text-sm font-semibold text-foreground">添加玩家</Text>
            <Text className="block text-xs text-muted-foreground ml-auto">{players.length}/12</Text>
          </View>
          <View className="flex flex-row gap-2 mb-3">
            <Input
              className="flex-1"
              placeholder="输入玩家名称..."
              value={newPlayerName}
              onInput={(e) => setNewPlayerName(e.detail.value)}
              onConfirm={addPlayer}
            />
            <Button size="sm" className="rounded-xl h-auto" onClick={addPlayer}>
              <Plus size={16} color="#fff" />
            </Button>
          </View>
          <View className="flex flex-row flex-wrap gap-2">
            {players.map((player, idx) => (
              <View
                key={idx}
                className="flex flex-row items-center gap-1 rounded-full px-3 py-1"
                style={{ backgroundColor: 'rgba(79,70,229,0.1)' }}
              >
                <User size={12} color="#4f46e5" />
                <Text className="text-sm text-primary font-medium">{player.name}</Text>
                <View className="cursor-pointer ml-1" onClick={() => removePlayer(idx)}>
                  <X size={12} color="#4f46e5" />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 开始按钮 */}
        <View className="px-4 pb-8 mt-auto">
          <Button
            className="w-full h-12 rounded-2xl text-base"
            onClick={startGame}
            disabled={!game || players.length < (game?.min_players || 1)}
          >
            <View className="flex flex-row items-center gap-2">
              <Play size={20} color="#fff" />
              <Text className="text-white font-bold">开始对局</Text>
            </View>
          </Button>
          <Text className="block text-xs text-muted-foreground text-center mt-3">
            {game ? `至少${game.min_players}人，最多${game.max_players}人` : ('请先选择桌游')}
          </Text>
        </View>
      </View>
    )
  }

  // =================== PLAYING PHASE ===================
  return (
    <View className="flex flex-col min-h-screen bg-background">
      {/* 顶部信息栏 */}
      <View
        className="px-4 pt-14 pb-3"
        style={{ background: game?.hero_bg || 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
      >
        <View className="flex flex-row items-center justify-between">
          <View className="flex-1 min-w-0">
            <Text className="block text-base font-bold text-white truncate">{game?.name}</Text>
            <Text className="block text-xs text-white text-opacity-70 mt-1">对局进行中</Text>
          </View>
          <View className="flex flex-row items-center gap-2 rounded-full px-3 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <Timer size={14} color="#fff" />
            <Text className="block text-sm text-white font-mono font-bold">{formatTime(elapsedSeconds)}</Text>
          </View>
        </View>
      </View>

      {/* 工具快捷入口 */}
      <View className="px-4 py-3 bg-white border-b border-border">
        <View className="flex flex-row justify-around">
          {TOOL_ITEMS.map((tool) => (
            <View
              key={tool.key}
              className="flex flex-col items-center cursor-pointer"
              onClick={() => goToTool(tool.path)}
            >
              <View className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-1">
                {tool.icon}
              </View>
              <Text className="block text-xs text-muted-foreground">{tool.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 核心内容区 */}
      <View className="flex-1 px-4 pt-4 pb-4 overflow-y-auto">
        {/* 计分板 */}
        <View className="mb-5">
          <View className="flex flex-row items-center justify-between mb-3">
            <View className="flex flex-row items-center gap-2">
              <View className="w-1 h-4 rounded-full bg-violet-500" />
              <Calculator size={16} color="#8b5cf6" />
              <Text className="block text-sm font-bold text-foreground">计分板</Text>
            </View>
            <View className="flex flex-row items-center gap-1">
              <Text className="text-xs text-muted-foreground">步长:</Text>
              {[1, 2, 5].map((s) => (
                <Badge
                  key={s}
                  variant={scoringStep === s ? 'default' : 'secondary'}
                  className="cursor-pointer"
                  onClick={() => setScoringStep(s)}
                >
                  <Text className="text-xs">{s}</Text>
                </Badge>
              ))}
            </View>
          </View>
          <View className="flex flex-col gap-2">
            {sortedPlayers.map((player, rank) => {
              const originalIdx = players.findIndex((p) => p.name === player.name)
              return (
                <Card key={player.name} className="shadow-sm">
                  <CardContent className="flex flex-row items-center p-3 gap-3">
                    <View
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: rank < 3 ? rankColors[rank] : '#e5e7eb' }}
                    >
                      <Text className="text-xs font-bold text-white">{rank + 1}</Text>
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="block text-sm font-semibold text-foreground truncate">{player.name}</Text>
                      <Text className="block text-2xl font-bold text-primary mt-1">{player.score}</Text>
                    </View>
                    <View className="flex flex-row items-center gap-2">
                      <Button variant="outline" size="sm" className="rounded-xl w-9 h-9 p-0" onClick={() => changeScore(originalIdx, -scoringStep)}>
                        <Minus size={14} color="#6b7280" />
                      </Button>
                      <Button size="sm" className="rounded-xl w-9 h-9 p-0" onClick={() => changeScore(originalIdx, scoringStep)}>
                        <Plus size={14} color="#fff" />
                      </Button>
                    </View>
                  </CardContent>
                </Card>
              )
            })}
          </View>
        </View>

        {/* 规则速查 */}
        {game?.rules && (
          <View className="mb-5">
            <View
              className="flex flex-row items-center justify-between mb-3"
              onClick={() => setRulesExpanded(v => !v)}
            >
              <View className="flex flex-row items-center gap-2">
                <View className="w-1 h-4 rounded-full bg-blue-500" />
                <BookOpen size={16} color="#3b82f6" />
                <Text className="block text-sm font-bold text-foreground">规则速查</Text>
              </View>
              <ChevronRight size={16} color="#9ca3af" style={{ transform: rulesExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }} />
            </View>
            {rulesExpanded && (
              <Card className="shadow-sm">
                <CardContent className="p-3">
                  <RichText nodes={markdownToRichText(game.rules)} />
                </CardContent>
              </Card>
            )}
          </View>
        )}

        {/* AI 问答 */}
        <View className="mb-5">
          <View className="flex flex-row items-center gap-2 mb-3">
            <View className="w-1 h-4 rounded-full bg-emerald-500" />
            <Sparkles size={16} color="#10b981" />
            <Text className="block text-sm font-bold text-foreground">AI 规则问答</Text>
          </View>
          <View className="flex flex-row gap-2 mb-2">
            <Input
              className="flex-1"
              placeholder="有问题？问AI..."
              value={aiQuestion}
              onInput={(e) => setAiQuestion(e.detail.value)}
              onConfirm={askAI}
            />
            <Button size="sm" className="rounded-xl h-auto px-4" onClick={askAI} disabled={aiLoading}>
              <Send size={14} color="#fff" />
            </Button>
          </View>
          {aiAnswer && (
            <Card className="shadow-sm border-l-4 border-l-emerald-400">
              <CardContent className="p-3">
                <Text className="block text-sm text-foreground leading-relaxed">{aiAnswer}</Text>
              </CardContent>
            </Card>
          )}
          {aiLoading && (
            <View className="flex items-center py-3 gap-2">
              <Sparkles size={14} color="#10b981" />
              <Text className="block text-xs text-muted-foreground">AI 思考中...</Text>
            </View>
          )}
        </View>

        {/* 精彩瞬间 - 照片墙 */}
        <View className="mb-5">
          <View className="flex flex-row items-center justify-between mb-3">
            <View className="flex flex-row items-center gap-2">
              <View className="w-1 h-4 rounded-full bg-rose-500" />
              <ImageIcon size={16} color="#f43f5e" />
              <Text className="block text-sm font-bold text-foreground">精彩瞬间</Text>
            </View>
            {photos.length > 0 && (
              <Text className="block text-xs text-muted-foreground">{photos.length}张</Text>
            )}
          </View>
          {photos.length > 0 ? (
            <View className="flex flex-row flex-wrap gap-1.5">
              {photos.map((photo) => (
                <View
                  key={photo.id}
                  className="w-[31%] aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer"
                  onClick={() => setPreviewPhoto(photo.url)}
                >
                  <Image
                    className="w-full h-full"
                    src={photo.url}
                    mode="aspectFill"
                  />
                </View>
              ))}
            </View>
          ) : (
            <View className="rounded-2xl border-2 border-dashed border-muted p-6 flex flex-col items-center">
              <Camera size={28} color="#d1d5db" />
              <Text className="block text-sm text-muted-foreground mt-2">记录桌游的精彩瞬间</Text>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 rounded-xl"
                onClick={() => setShowPhotoActions(true)}
                disabled={uploading}
              >
                <Text>{uploading ? '上传中...' : '添加照片'}</Text>
              </Button>
            </View>
          )}
        </View>
      </View>

      {/* 底部操作栏 */}
      <View
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'row',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: '#fff',
          borderTop: '1px solid #e5e7eb',
          zIndex: 100,
        }}
      >
        <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => { setTimerRunning(false); setPhase('setup') }}>
          <View className="flex flex-row items-center gap-1">
            <RotateCcw size={14} color="#6b7280" />
            <Text>退出</Text>
          </View>
        </Button>
        <Button
          variant="outline"
          className="rounded-xl h-11 w-11 p-0 flex-shrink-0"
          onClick={() => setShowPhotoActions(true)}
          disabled={uploading}
        >
          <Camera size={18} color={uploading ? '#d1d5db' : '#8b5cf6'} />
        </Button>
        <Button className="flex-1 rounded-xl h-11" onClick={() => setShowFinishDialog(true)}>
          <View className="flex flex-row items-center gap-1">
            <Trophy size={14} color="#fff" />
            <Text className="text-white font-semibold">结束对局</Text>
          </View>
        </Button>
      </View>

      <View className="h-16" />

      {/* 结束确认弹窗 */}
      <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认结束对局？</DialogTitle>
          </DialogHeader>
          <View className="mt-2">
            {sortedPlayers.length > 0 && (
              <View className="flex flex-col gap-2 mb-4">
                {sortedPlayers.map((p, idx) => (
                  <View key={p.name} className="flex flex-row items-center justify-between py-2">
                    <View className="flex flex-row items-center gap-2">
                      <View
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: idx < 3 ? rankColors[idx] : '#e5e7eb' }}
                      >
                        <Text className="text-xs font-bold text-white">{idx + 1}</Text>
                      </View>
                      <Text className="block text-sm font-medium text-foreground">{p.name}</Text>
                    </View>
                    <Text className="block text-sm font-bold text-primary">{p.score}分</Text>
                  </View>
                ))}
              </View>
            )}
            <View className="flex flex-row gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowFinishDialog(false)}>
                <Text>取消</Text>
              </Button>
              <Button className="flex-1 rounded-xl" onClick={finishGame}>
                <Text className="text-white">确认结束</Text>
              </Button>
            </View>
          </View>
        </DialogContent>
      </Dialog>

      {/* 照片操作弹出层 */}
      <Dialog open={showPhotoActions} onOpenChange={setShowPhotoActions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加照片</DialogTitle>
          </DialogHeader>
          <View className="flex flex-col gap-3 mt-2">
            {!isMiniApp && (
              <View className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-1">
                <Text className="block text-xs text-amber-700">
                  拍照功能在 H5 端有限制，建议使用相册选择
                </Text>
              </View>
            )}
            <Button className="rounded-xl h-12" onClick={handleTakePhoto}>
              <View className="flex flex-row items-center gap-2">
                <Camera size={18} color="#fff" />
                <Text className="text-white font-medium">拍照</Text>
              </View>
            </Button>
            <Button variant="outline" className="rounded-xl h-12" onClick={handlePickFromAlbum}>
              <View className="flex flex-row items-center gap-2">
                <ImageIcon size={18} color="#6b7280" />
                <Text className="font-medium">从相册选择（最多9张）</Text>
              </View>
            </Button>
            {uploading && (
              <View className="flex items-center py-2">
                <Text className="block text-sm text-muted-foreground">正在上传照片...</Text>
              </View>
            )}
          </View>
        </DialogContent>
      </Dialog>

      {/* 照片预览 */}
      <Dialog open={!!previewPhoto} onOpenChange={(open) => { if (!open) setPreviewPhoto(null) }}>
        <DialogContent className="max-w-[90vw]">
          <View className="relative flex items-center justify-center">
            <Image
              className="w-full rounded-xl"
              src={previewPhoto || ''}
              mode="widthFix"
              style={{ maxHeight: '70vh' }}
            />
            <View className="absolute bottom-3 right-3">
              <View
                className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                onClick={() => {
                  const photo = photos.find((p) => p.url === previewPhoto)
                  if (photo) deletePhoto(photo.id)
                }}
              >
                <Trash2 size={18} color="#fff" />
              </View>
            </View>
          </View>
        </DialogContent>
      </Dialog>
      {phase === 'finished' && (
        <View className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Card className="w-72 shadow-xl">
            <CardContent className="flex flex-col items-center p-6">
              <View className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                <Trophy size={32} color="#eab308" />
              </View>
              <Text className="block text-lg font-bold text-foreground">对局结束！</Text>
              {sortedPlayers[0] && (
                <Text className="block text-sm text-muted-foreground mt-1">
                  冠军: {sortedPlayers[0].name} ({sortedPlayers[0].score}分)
                </Text>
              )}
              <View className="flex flex-row gap-3 mt-5 w-full">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => Taro.navigateBack()}>
                  <Text>返回</Text>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => {
                    Taro.navigateTo({ url: `/pages/poster/index?sessionId=${sessionId}` })
                  }}
                >
                  <ImageIcon size={16} color="#6366f1" />
                  <Text className="ml-1">海报</Text>
                </Button>
                <Button
                  className="flex-1 rounded-xl"
                  onClick={() => {
                    setPhase('setup')
                    setPlayers(players.map((p) => ({ ...p, score: 0 })))
                    setElapsedSeconds(0)
                  }}
                >
                  <Text className="text-white">再来一局</Text>
                </Button>
              </View>
            </CardContent>
          </Card>
        </View>
      )}
    </View>
  )
}

export default NavigatorPage
