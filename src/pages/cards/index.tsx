import { View, Text } from '@tarojs/components'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
    <View className="flex flex-col min-h-screen bg-[#f5f5f7]">
      {/* 标题 */}
      <View className="px-5 pt-12 pb-4 bg-white">
        <View className="flex flex-row items-center gap-3">
          <View className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <Layers size={18} color="#fff" />
          </View>
          <Text className="block text-xl font-bold text-[#1e1b4b]">抽牌</Text>
        </View>
      </View>

      {/* 模式切换 */}
      <View className="px-5 mt-4 mb-4">
        <View className="flex flex-row gap-2">
          <Badge
            variant={mode === 'standard' ? 'default' : 'secondary'}
            className="cursor-pointer rounded-lg px-4 py-2"
            onClick={() => switchMode('standard')}
          >
            <Text className="text-sm font-medium">标准扑克</Text>
          </Badge>
          <Badge
            variant={mode === 'custom' ? 'default' : 'secondary'}
            className="cursor-pointer rounded-lg px-4 py-2"
            onClick={() => switchMode('custom')}
          >
            <Text className="text-sm font-medium">自定义</Text>
          </Badge>
        </View>
      </View>

      {/* 自定义牌组管理 */}
      {mode === 'custom' && (
        <View className="px-5 mb-4 bg-white mx-4 rounded-2xl p-4">
          <View className="flex flex-row items-center justify-between mb-3">
            <Text className="block text-sm font-medium text-[#374151]">牌组内容 ({customNames.length})</Text>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <View className="cursor-pointer w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Plus size={16} color="#4F46E5" />
                </View>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>添加牌面</DialogTitle>
                </DialogHeader>
                <View className="flex flex-row gap-2 mt-2">
                  <View className="flex-1 bg-gray-50 rounded-xl px-4 py-3">
                    <Input
                      placeholder="输入牌面名称..."
                      value={newName}
                      onInput={(e) => setNewName(e.detail.value)}
                      onConfirm={addCustomName}
                      className="bg-transparent"
                    />
                  </View>
                  <Button size="sm" onClick={() => { addCustomName(); setDialogOpen(false) }} className="rounded-xl">
                    <Text className="text-white">添加</Text>
                  </Button>
                </View>
              </DialogContent>
            </Dialog>
          </View>
          <View className="flex flex-row flex-wrap gap-2">
            {customNames.map((name, idx) => (
              <Badge key={idx} variant="secondary" className="flex flex-row items-center gap-1 rounded-lg px-3 py-1">
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
      <View className="px-5 mb-2">
        <View className="flex flex-row items-center gap-2">
          <View className="w-2 h-2 rounded-full" style={{ backgroundColor: deck.length > 0 ? '#4F46E5' : '#ef4444' }} />
          <Text className="block text-sm text-gray-400">剩余 {deck.length} 张</Text>
        </View>
      </View>

      {/* 抽到的牌 */}
      <View className="flex-1 px-5">
        {drawn.length > 0 ? (
          <View className="flex flex-row flex-wrap gap-2 mb-4">
            {drawn.map((card, i) => (
              <View
                key={i}
                className="w-16 h-24 rounded-xl bg-white flex items-center justify-center"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              >
                <Text className="block text-lg font-bold" style={{ color: card.color }}>
                  {card.label}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View className="flex flex-col items-center opacity-30 py-16">
            <Layers size={64} color="#f59e0b" />
            <Text className="block text-sm text-gray-400 mt-4">点击下方按钮抽牌</Text>
          </View>
        )}
      </View>

      {/* 操作按钮 */}
      <View className="px-5 pb-8 flex flex-row gap-3">
        <Button variant="outline" className="flex-1 rounded-2xl h-11" onClick={resetDeck}>
          <Text className="text-gray-500">重置牌组</Text>
        </Button>
        <Button
          className="flex-1 rounded-2xl h-11"
          onClick={drawCard}
          disabled={deck.length === 0}
          style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
        >
          <View className="flex flex-row items-center gap-2">
            <Shuffle size={16} color="#fff" />
            <Text className="text-white font-semibold">抽牌</Text>
          </View>
        </Button>
      </View>
    </View>
  )
}

export default CardsPage
