import { View, Text } from '@tarojs/components'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Layers, Plus, X, Shuffle } from 'lucide-react-taro'
import type { FC } from 'react'

interface CardItem {
  suit: string
  rank: string
  label: string
  color: string
}

const SUITS = [
  { key: 'hearts', label: '红桃', symbol: '♥', color: '#ef4444' },
  { key: 'diamonds', label: '方块', symbol: '♦', color: '#ef4444' },
  { key: 'clubs', label: '梅花', symbol: '♣', color: '#1f2937' },
  { key: 'spades', label: '黑桃', symbol: '♠', color: '#1f2937' },
]

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

const STANDARD_DECK: CardItem[] = SUITS.flatMap((suit) =>
  RANKS.map((rank) => ({
    suit: suit.key,
    rank,
    label: `${suit.symbol}${rank}`,
    color: suit.color,
  }))
)

type DeckMode = 'standard' | 'custom'

const CardsPage: FC = () => {
  const [mode, setMode] = useState<DeckMode>('standard')
  const [deck, setDeck] = useState<CardItem[]>([...STANDARD_DECK])
  const [drawn, setDrawn] = useState<CardItem[]>([])
  const [customNames, setCustomNames] = useState<string[]>(['选项A', '选项B', '选项C'])
  const [newName, setNewName] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const drawCard = () => {
    if (deck.length === 0) return
    const idx = Math.floor(Math.random() * deck.length)
    const card = deck[idx]
    setDeck(deck.filter((_, i) => i !== idx))
    setDrawn([card, ...drawn])
  }

  const resetDeck = () => {
    if (mode === 'standard') {
      setDeck([...STANDARD_DECK])
    } else {
      setDeck(customNames.map((name) => ({ suit: 'custom', rank: name, label: name, color: '#6366f1' })))
    }
    setDrawn([])
  }

  const switchMode = (newMode: DeckMode) => {
    setMode(newMode)
    setDrawn([])
    if (newMode === 'standard') {
      setDeck([...STANDARD_DECK])
    } else {
      setDeck(customNames.map((name) => ({ suit: 'custom', rank: name, label: name, color: '#6366f1' })))
    }
  }

  const addCustomName = () => {
    if (!newName.trim()) return
    const updated = [...customNames, newName.trim()]
    setCustomNames(updated)
    setNewName('')
    setDeck(updated.map((name) => ({ suit: 'custom', rank: name, label: name, color: '#6366f1' })))
    setDrawn([])
  }

  const removeCustomName = (idx: number) => {
    const updated = customNames.filter((_, i) => i !== idx)
    setCustomNames(updated)
    setDeck(updated.map((name) => ({ suit: 'custom', rank: name, label: name, color: '#6366f1' })))
    setDrawn([])
  }

  return (
    <View className="flex flex-col min-h-screen bg-background">
      {/* 标题 */}
      <View className="px-4 pt-12 pb-4">
        <View className="flex flex-row items-center gap-2">
          <Layers size={22} color="#f59e0b" />
          <Text className="block text-xl font-bold text-foreground">抽牌</Text>
        </View>
      </View>

      {/* 模式切换 */}
      <View className="px-4 mb-4">
        <View className="flex flex-row gap-2">
          <Badge
            variant={mode === 'standard' ? 'default' : 'secondary'}
            className="cursor-pointer"
            onClick={() => switchMode('standard')}
          >
            <Text className="text-sm">标准扑克</Text>
          </Badge>
          <Badge
            variant={mode === 'custom' ? 'default' : 'secondary'}
            className="cursor-pointer"
            onClick={() => switchMode('custom')}
          >
            <Text className="text-sm">自定义</Text>
          </Badge>
        </View>
      </View>

      {/* 自定义牌组管理 */}
      {mode === 'custom' && (
        <View className="px-4 mb-4">
          <View className="flex flex-row items-center justify-between mb-2">
            <Text className="block text-sm font-medium text-foreground">牌组内容 ({customNames.length})</Text>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <View className="cursor-pointer">
                  <Plus size={18} color="#6366f1" />
                </View>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>添加牌面</DialogTitle>
                </DialogHeader>
                <View className="flex flex-row gap-2 mt-2">
                  <View className="flex-1">
                    <Input
                      placeholder="输入牌面名称..."
                      value={newName}
                      onInput={(e) => setNewName(e.detail.value)}
                      onConfirm={addCustomName}
                    />
                  </View>
                  <Button size="sm" onClick={() => { addCustomName(); setDialogOpen(false) }}>
                    <Text className="text-white">添加</Text>
                  </Button>
                </View>
              </DialogContent>
            </Dialog>
          </View>
          <View className="flex flex-row flex-wrap gap-2">
            {customNames.map((name, idx) => (
              <Badge key={idx} variant="secondary" className="flex flex-row items-center gap-1">
                <Text className="text-sm">{name}</Text>
                <View className="cursor-pointer" onClick={() => removeCustomName(idx)}>
                  <X size={12} color="#9ca3af" />
                </View>
              </Badge>
            ))}
          </View>
        </View>
      )}

      {/* 牌组剩余 */}
      <View className="px-4 mb-2">
        <Text className="block text-sm text-muted-foreground">剩余 {deck.length} 张</Text>
      </View>

      {/* 抽到的牌 */}
      <View className="flex-1 px-4">
        {drawn.length > 0 ? (
          <View className="flex flex-row flex-wrap gap-2 mb-4">
            {drawn.map((card, i) => (
              <Card key={i} className="w-16 h-24">
                <CardContent className="flex items-center justify-center h-full p-0">
                  <Text className="block text-lg font-bold" style={{ color: card.color }}>
                    {card.label}
                  </Text>
                </CardContent>
              </Card>
            ))}
          </View>
        ) : (
          <View className="flex flex-col items-center opacity-40 py-16">
            <Layers size={64} color="#f59e0b" />
            <Text className="block text-sm text-muted-foreground mt-4">点击下方按钮抽牌</Text>
          </View>
        )}
      </View>

      {/* 操作按钮 */}
      <View className="px-4 pb-8 flex flex-row gap-3">
        <Button variant="outline" className="flex-1" onClick={resetDeck}>
          <Text>重置牌组</Text>
        </Button>
        <Button className="flex-1" onClick={drawCard} disabled={deck.length === 0}>
          <View className="flex flex-row items-center gap-2">
            <Shuffle size={16} color="#fff" />
            <Text className="text-white">抽牌</Text>
          </View>
        </Button>
      </View>
    </View>
  )
}

export default CardsPage
