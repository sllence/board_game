import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { checkLogin } from '@/utils/auth'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import {
  Play, Plus, X, User, Dices, Timer, Layers,
  Shuffle, Calculator, BookOpen,
  Trophy, RotateCcw, Minus, Send, Sparkles, ChessKing
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
  sections: { title: string; content: string }[]
  tips: string[]
  scoring_config: Record<string, unknown>
}

interface Player {
  name: string
  score: number
  faction?: string
  customScores?: Record<string, number>
}

type Phase = 'setup' | 'playing' | 'finished'

const TOOL_ITEMS = [
  { key: 'dice', label: '骰子', icon: <Dices size={20} color="#6366f1" />, path: '/pages/dice/index' },
  { key: 'timer', label: '计时', icon: <Timer size={20} color="#10b981" />, path: '/pages/timer/index' },
  { key: 'cards', label: '抽牌', icon: <Layers size={20} color="#f59e0b" />, path: '/pages/cards/index' },
  { key: 'random', label: '选人', icon: <Shuffle size={20} color="#ef4444" />, path: '/pages/random/index' },
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

  useEffect(() => {
    if (!checkLogin()) {
      Taro.showModal({
        title: '需要登录',
        content: '请先登录后再开始对局',
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
    if (gameId) {
      fetchGame(Number(gameId))
    }
  }, [])

  useEffect(() => {
    if (!timerRunning) return
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [timerRunning])

  const fetchGame = async (id: number) => {
    try {
      const res = await Network.request({ url: `/api/games/${id}` })
      console.log('[NavigatorPage] fetchGame response:', res.data)
      const gameData = res.data?.data
      if (gameData) {
        setGame(gameData)
      }
    } catch (err) {
      console.error('[NavigatorPage] fetchGame error:', err)
    }
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
      const res = await Network.request({
        url: '/api/sessions',
        method: 'POST',
        data: {
          game_id: game.id,
          sessionName: `${game.name} 对局`,
          players: players.map((p) => p.name),
        },
      })
      console.log('[NavigatorPage] createSession response:', res.data)
      const id = res.data?.data?.id
      if (id) setSessionId(id)
      setPhase('playing')
      setTimerRunning(true)
    } catch (err) {
      console.error('[NavigatorPage] createSession error:', err)
      setPhase('playing')
      setTimerRunning(true)
    }
  }

  const changeScore = (idx: number, delta: number) => {
    setPlayers(players.map((p, i) => (i === idx ? { ...p, score: p.score + delta } : p)))
  }

  const finishGame = async () => {
    setTimerRunning(false)
    setShowFinishDialog(true)
    if (sessionId) {
      try {
        const sorted = [...players].sort((a, b) => b.score - a.score)
        await Network.request({
          url: `/api/sessions/${sessionId}/finish`,
          method: 'POST',
          data: {
            winner: sorted[0]?.name,
            scoringSnapshot: players.map((p) => ({ name: p.name, score: p.score })),
          },
        })
        console.log('[NavigatorPage] finishSession success')
      } catch (err) {
        console.error('[NavigatorPage] finishSession error:', err)
      }
    }
    setPhase('finished')
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
      setAiAnswer(res.data?.data?.answer || '暂无回答')
    } catch (err) {
      console.error('[NavigatorPage] askAI error:', err)
      setAiAnswer('AI回答失败，请稍后重试')
    } finally {
      setAiLoading(false)
    }
  }

  const goToTool = (path: string) => {
    Taro.navigateTo({ url: path })
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const sections = Array.isArray(game?.sections) ? game.sections : []

  // =================== SETUP PHASE ===================
  if (phase === 'setup') {
    return (
      <View className="flex flex-col min-h-screen bg-gradient-to-b from-indigo-50 to-background">
        {/* Header */}
        <View className="px-4 pt-14 pb-6">
          <Text className="block text-2xl font-bold text-foreground">对局设置</Text>
          <Text className="block text-sm text-muted-foreground mt-1">选择桌游、添加玩家，准备开始</Text>
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
            <View className="flex-1 bg-white rounded-xl px-4 py-3 shadow-sm border border-border">
              <Input
                placeholder="输入玩家名称..."
                value={newPlayerName}
                onInput={(e) => setNewPlayerName(e.detail.value)}
                onConfirm={addPlayer}
              />
            </View>
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
            {game ? `至少${game.min_players}人，最多${game.max_players}人` : '请先选择桌游'}
          </Text>
        </View>
      </View>
    )
  }

  // =================== PLAYING PHASE ===================
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
  const rankColors = ['#eab308', '#9ca3af', '#b45309']

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
        {sections.length > 0 && (
          <View className="mb-5">
            <View className="flex flex-row items-center gap-2 mb-3">
              <View className="w-1 h-4 rounded-full bg-blue-500" />
              <BookOpen size={16} color="#3b82f6" />
              <Text className="block text-sm font-bold text-foreground">规则速查</Text>
            </View>
            <Accordion type="multiple" defaultValue={[]}>
              {sections.map((section, idx) => (
                <AccordionItem key={idx} value={`nav-section-${idx}`}>
                  <AccordionTrigger>
                    <Text className="text-xs font-medium">{section.title}</Text>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Text className="block text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                      {section.content}
                    </Text>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
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
            <View className="flex-1 bg-white rounded-xl px-4 py-3 shadow-sm border border-border">
              <Input
                placeholder="有问题？问AI..."
                value={aiQuestion}
                onInput={(e) => setAiQuestion(e.detail.value)}
                onConfirm={askAI}
              />
            </View>
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

      {/* 已结束提示 */}
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