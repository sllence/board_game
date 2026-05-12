import { View, Text } from '@tarojs/components'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dices } from 'lucide-react-taro'
import type { FC } from 'react'

const DICE_TYPES = [
  { key: 'd4', label: 'D4', max: 4 },
  { key: 'd6', label: 'D6', max: 6 },
  { key: 'd8', label: 'D8', max: 8 },
  { key: 'd10', label: 'D10', max: 10 },
  { key: 'd12', label: 'D12', max: 12 },
  { key: 'd20', label: 'D20', max: 20 },
]

const DicePage: FC = () => {
  const [selectedDice, setSelectedDice] = useState(DICE_TYPES[1]) // D6 default
  const [results, setResults] = useState<number[]>([])
  const [diceCount, setDiceCount] = useState(1)
  const [rolling, setRolling] = useState(false)

  const roll = () => {
    setRolling(true)
    // Simple animation: show random values quickly
    let count = 0
    const interval = setInterval(() => {
      const newResults = Array.from({ length: diceCount }, () =>
        Math.floor(Math.random() * selectedDice.max) + 1
      )
      setResults(newResults)
      count++
      if (count >= 8) {
        clearInterval(interval)
        setRolling(false)
      }
    }, 80)
  }

  const total = results.reduce((sum, n) => sum + n, 0)

  return (
    <View className="flex flex-col min-h-screen bg-background">
      {/* 标题 */}
      <View className="px-4 pt-12 pb-4">
        <View className="flex flex-row items-center gap-2">
          <Dices size={22} color="#6366f1" />
          <Text className="block text-xl font-bold text-foreground">骰子</Text>
        </View>
      </View>

      {/* 骰子类型选择 */}
      <View className="px-4 mb-4">
        <Text className="block text-sm font-medium text-foreground mb-2">选择骰子</Text>
        <View className="flex flex-row flex-wrap gap-2">
          {DICE_TYPES.map((dice) => (
            <Badge
              key={dice.key}
              variant={selectedDice.key === dice.key ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => { setSelectedDice(dice); setResults([]) }}
            >
              <Text className="text-sm">{dice.label}</Text>
            </Badge>
          ))}
        </View>
      </View>

      {/* 骰子数量 */}
      <View className="px-4 mb-4">
        <Text className="block text-sm font-medium text-foreground mb-2">数量</Text>
        <View className="flex flex-row items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setDiceCount(Math.max(1, diceCount - 1))}>
            <Text>-</Text>
          </Button>
          <Text className="block text-lg font-bold text-foreground w-8 text-center">{diceCount}</Text>
          <Button variant="outline" size="sm" onClick={() => setDiceCount(Math.min(10, diceCount + 1))}>
            <Text>+</Text>
          </Button>
        </View>
      </View>

      {/* 结果展示 */}
      <View className="flex-1 flex flex-col items-center justify-center px-4">
        {results.length > 0 ? (
          <>
            <View className="flex flex-row flex-wrap justify-center gap-3 mb-6">
              {results.map((r, i) => (
                <Card key={i} className="w-16 h-16">
                  <CardContent className="flex items-center justify-center h-full p-0">
                    <Text className="block text-2xl font-bold text-foreground">{r}</Text>
                  </CardContent>
                </Card>
              ))}
            </View>
            {diceCount > 1 && (
              <Card>
                <CardContent className="px-6 py-3">
                  <Text className="block text-sm text-muted-foreground">总计</Text>
                  <Text className="block text-3xl font-bold text-primary">{total}</Text>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <View className="flex flex-col items-center opacity-40">
            <Dices size={64} color="#6366f1" />
            <Text className="block text-sm text-muted-foreground mt-4">点击下方按钮掷骰</Text>
          </View>
        )}
      </View>

      {/* 掷骰按钮 */}
      <View className="px-4 pb-8">
        <Button className="w-full h-12" onClick={roll} disabled={rolling}>
          <Text className="text-white font-semibold text-base">{rolling ? '掷骰中...' : '掷骰子'}</Text>
        </Button>
      </View>
    </View>
  )
}

export default DicePage
