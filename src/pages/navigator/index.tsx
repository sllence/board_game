import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import {
  Play, Plus, X, User, Dices, Timer, Layers,
  Shuffle, Calculator, MessageSquare, BookOpen,
  Trophy, RotateCcw, Minus, Send
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
  { key: 'dice', label: '骰子', icon: <Dices size={18} color="#6366f1" />, path: '/pages/dice/index' },
  { key: 'timer', label: '计时', icon: <Timer size={18} color="#10b981" />, path: '/pages/timer/index' },
  { key: 'cards', label: '抽牌', icon: <Layers size={18} color="#f59e0b" />, path: '/pages/cards/index' },
  { key: 'random', label: '选人', icon: <Shuffle size={18} color="#ef4444" />, path: '/pages/random/index' },
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

  // Load game info
  useEffect(() => {
    const instance = Taro.getCurrentInstance()
    const gameId = instance?.router?.params?.gameId
    if (gameId) {
      fetchGame(Number(gameId))
    }
  }, [])

  // Timer
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
      // Still start locally even if API fails
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
      <View className="flex flex-col min-h-screen bg-background">
        <View className="px-4 pt-12 pb-4">
          <Text className="block text-xl font-bold text-foreground">对局设置</Text>
        </View>

        {/* 游戏信息 */}
        {game && (
          <View className="px-4 mb-4">
            <Card>
              <CardContent className="flex flex-row items-center p-4 gap-3">
                <View
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: game.icon_bg || '#e5e7eb' }}
                >
                  <Text className="text-lg font-bold" style={{ color: game.icon_color || '#1f2937' }}>
                    {game.name.charAt(0)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="block text-base font-semibold text-foreground">{game.name}</Text>
                  <Text className="block text-xs text-muted-foreground mt-1">
                    {game.min_players}-{game.max_players}人 | {game.duration}分钟
                  </Text>
                </View>
              </CardContent>
            </Card>
          </View>
        )}

        {!game && (
          <View className="px-4 mb-4">
            <Text className="block text-sm text-muted-foreground">请从桌游馆选择一个桌游开始</Text>
          </View>
        )}

        {/* 添加玩家 */}
        <View className="px-4 mb-4">
          <Text className="block text-sm font-medium text-foreground mb-2">添加玩家</Text>
          <View className="flex flex-row gap-2 mb-3">
            <View className="flex-1">
              <Input
                placeholder="输入玩家名称..."
                value={newPlayerName}
                onInput={(e) => setNewPlayerName(e.detail.value)}
                onConfirm={addPlayer}
              />
            </View>
            <Button size="sm" onClick={addPlayer}>
              <View className="flex flex-row items-center gap-1">
                <Plus size={14} color="#fff" />
                <Text className="text-white">添加</Text>
              </View>
            </Button>
          </View>
          <View className="flex flex-row flex-wrap gap-2">
            {players.map((player, idx) => (
              <Badge key={idx} variant="secondary" className="flex flex-row items-center gap-1">
                <User size={12} color="#9ca3af" />
                <Text className="text-sm">{player.name}</Text>
                <View className="cursor-pointer" onClick={() => removePlayer(idx)}>
                  <X size={12} color="#9ca3af" />
                </View>
              </Badge>
            ))}
          </View>
        </View>

        {/* 开始按钮 */}
        <View className="px-4 pb-8 mt-auto">
          <Button
            className="w-full h-12"
            onClick={startGame}
            disabled={!game || players.length < (game?.min_players || 1)}
          >
            <View className="flex flex-row items-center gap-2">
              <Play size={18} color="#fff" />
              <Text className="text-white font-semibold">开始对局</Text>
            </View>
          </Button>
          <Text className="block text-xs text-muted-foreground text-center mt-2">
            {game ? `至少${game.min_players}人，最多${game.max_players}人` : '请先选择桌游'}
          </Text>
        </View>
      </View>
    )
  }

  // =================== PLAYING PHASE ===================
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

  return (
    <View className="flex flex-col min-h-screen bg-background">
      {/* 顶部信息栏 */}
      <View className="px-4 pt-12 pb-3 bg-muted bg-opacity-30">
        <View className="flex flex-row items-center justify-between">
          <View className="flex-1 min-w-0">
            <Text className="block text-base font-semibold text-foreground truncate">{game?.name} - 对局中</Text>
          </View>
          <View className="flex flex-row items-center gap-2">
            <Timer size={14} color="#9ca3af" />
            <Text className="block text-sm text-muted-foreground font-mono">{formatTime(elapsedSeconds)}</Text>
          </View>
        </View>
      </View>

      {/* 工具快捷入口 */}
      <View className="px-4 py-3 border-b border-border">
        <View className="flex flex-row justify-around">
          {TOOL_ITEMS.map((tool) => (
            <View
              key={tool.key}
              className="flex flex-col items-center cursor-pointer"
              onClick={() => goToTool(tool.path)}
            >
              {tool.icon}
              <Text className="block text-xs text-muted-foreground mt-1">{tool.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 核心内容区 */}
      <View className="flex-1 px-4 pt-3 pb-4 overflow-y-auto">
        {/* 计分板 */}
        <View className="mb-4">
          <View className="flex flex-row items-center justify-between mb-2">
            <View className="flex flex-row items-center gap-2">
              <Calculator size={16} color="#8b5cf6" />
              <Text className="block text-sm font-semibold text-foreground">计分板</Text>
            </View>
            <View className="flex flex-row items-center gap-2">
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
          </View>
          <View className="flex flex-col gap-2">
            {sortedPlayers.map((player) => {
              const originalIdx = players.findIndex((p) => p.name === player.name)
              return (
                <Card key={player.name}>
                  <CardContent className="flex flex-row items-center p-3 gap-3">
                    <Text className="block text-sm font-bold text-muted-foreground w-6">{originalIdx + 1}</Text>
                    <View className="flex-1 min-w-0">
                      <Text className="block text-sm font-medium text-foreground truncate">{player.name}</Text>
                      <Text className="block text-xl font-bold text-primary mt-1">{player.score}</Text>
                    </View>
                    <View className="flex flex-row items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => changeScore(originalIdx, -scoringStep)}>
                        <Minus size={14} color="#6b7280" />
                      </Button>
                      <Button size="sm" onClick={() => changeScore(originalIdx, scoringStep)}>
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
          <View className="mb-4">
            <View className="flex flex-row items-center gap-2 mb-2">
              <BookOpen size={16} color="#3b82f6" />
              <Text className="block text-sm font-semibold text-foreground">规则速查</Text>
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
        <View className="mb-4">
          <View className="flex flex-row items-center gap-2 mb-2">
            <MessageSquare size={16} color="#10b981" />
            <Text className="block text-sm font-semibold text-foreground">AI 规则问答</Text>
          </View>
          <View className="flex flex-row gap-2 mb-2">
            <View className="flex-1">
              <Input
                placeholder="有问题？问AI..."
                value={aiQuestion}
                onInput={(e) => setAiQuestion(e.detail.value)}
                onConfirm={askAI}
              />
            </View>
            <Button size="sm" onClick={askAI} disabled={aiLoading}>
              <Send size={14} color="#fff" />
            </Button>
          </View>
          {aiAnswer && (
            <Card>
              <CardContent className="p-3">
                <Text className="block text-sm text-foreground leading-relaxed">{aiAnswer}</Text>
              </CardContent>
            </Card>
          )}
          {aiLoading && (
            <View className="flex items-center py-2">
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
        <Button variant="outline" className="flex-1" onClick={() => { setTimerRunning(false); setPhase('setup') }}>
          <View className="flex flex-row items-center gap-1">
            <RotateCcw size={14} color="#6b7280" />
            <Text>退出</Text>
          </View>
        </Button>
        <Button className="flex-1" onClick={() => setShowFinishDialog(true)}>
          <View className="flex flex-row items-center gap-1">
            <Trophy size={14} color="#fff" />
            <Text className="text-white">结束对局</Text>
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
                  <View key={p.name} className="flex flex-row items-center justify-between">
                    <View className="flex flex-row items-center gap-2">
                      {idx === 0 && <Trophy size={16} color="#eab308" />}
                      <Text className="block text-sm font-medium text-foreground">{p.name}</Text>
                    </View>
                    <Text className="block text-sm font-bold text-primary">{p.score}分</Text>
                  </View>
                ))}
              </View>
            )}
            <View className="flex flex-row gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowFinishDialog(false)}>
                <Text>取消</Text>
              </Button>
              <Button className="flex-1" onClick={finishGame}>
                <Text className="text-white">确认结束</Text>
              </Button>
            </View>
          </View>
        </DialogContent>
      </Dialog>

      {/* 已结束提示 */}
      {phase === 'finished' && (
        <View className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <Card className="w-72">
            <CardContent className="flex flex-col items-center p-6">
              <Trophy size={48} color="#eab308" />
              <Text className="block text-lg font-bold text-foreground mt-3">对局结束！</Text>
              {sortedPlayers[0] && (
                <Text className="block text-sm text-muted-foreground mt-1">
                  冠军: {sortedPlayers[0].name} ({sortedPlayers[0].score}分)
                </Text>
              )}
              <View className="flex flex-row gap-3 mt-4 w-full">
                <Button variant="outline" className="flex-1" onClick={() => Taro.navigateBack()}>
                  <Text>返回</Text>
                </Button>
                <Button
                  className="flex-1"
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
