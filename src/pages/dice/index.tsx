import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dices, ArrowLeft } from 'lucide-react-taro'
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
  const [selectedDice, setSelectedDice] = useState(DICE_TYPES[1])
  const [results, setResults] = useState<number[]>([])
  const [diceCount, setDiceCount] = useState(1)
  const [rolling, setRolling] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const roll = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRolling(true)
    let count = 0
    intervalRef.current = setInterval(() => {
      const newResults = Array.from({ length: diceCount }, () =>
        Math.floor(Math.random() * selectedDice.max) + 1
      )
      setResults(newResults)
      count++
      if (count >= 8) {
        clearInterval(intervalRef.current!)
        intervalRef.current = null
        setRolling(false)
      }
    }, 80)
  }

  const total = results.reduce((sum, n) => sum + n, 0)

  return (
    <View className="flex flex-col min-h-screen bg-[#f5f5f7]">
      {/* 标题 */}
      <View className="px-5 pt-12 pb-4 bg-white">
        <View className="flex flex-row items-center justify-between">
          <View className="flex flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <Dices size={18} color="#fff" />
            </View>
            <Text className="block text-xl font-bold text-[#1e1b4b]">骰子</Text>
          </View>
          {Taro.getCurrentPages().length > 1 && (
            <View className="flex flex-row items-center gap-1 cursor-pointer" onClick={() => Taro.navigateBack()}>
              <ArrowLeft size={14} color="#6366f1" />
              <Text className="text-sm text-indigo-500">返回对局</Text>
            </View>
          )}
        </View>
      </View>

      {/* 骰子类型选择 */}
      <View className="px-5 mt-4 mb-4">
        <Text className="block text-sm font-medium text-[#374151] mb-3">选择骰子</Text>
        <View className="flex flex-row flex-wrap gap-2">
          {DICE_TYPES.map((dice) => (
            <Badge
              key={dice.key}
              variant={selectedDice.key === dice.key ? 'default' : 'secondary'}
              className="cursor-pointer rounded-lg px-4 py-2"
              onClick={() => { setSelectedDice(dice); setResults([]) }}
            >
              <Text className="text-sm font-medium">{dice.label}</Text>
            </Badge>
          ))}
        </View>
      </View>

      {/* 骰子数量 */}
      <View className="px-5 mb-5 bg-white mx-4 rounded-2xl py-4">
        <Text className="block text-sm font-medium text-[#374151] mb-3">数量</Text>
        <View className="flex flex-row items-center justify-center gap-6">
          <View
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer"
            onClick={() => setDiceCount(Math.max(1, diceCount - 1))}
          >
            <Text className="text-lg font-bold text-[#374151]">-</Text>
          </View>
          <Text className="block text-2xl font-bold text-[#1e1b4b] w-10 text-center">{diceCount}</Text>
          <View
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer"
            onClick={() => setDiceCount(Math.min(10, diceCount + 1))}
          >
            <Text className="text-lg font-bold text-[#374151]">+</Text>
          </View>
        </View>
      </View>

      {/* 结果展示 */}
      <View className="flex-1 flex flex-col items-center justify-center px-5">
        {results.length > 0 ? (
          <>
            <View className="flex flex-row flex-wrap justify-center gap-3 mb-6">
              {results.map((r, i) => (
                <View
                  key={i}
                  className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                >
                  <Text className="block text-2xl font-bold text-[#4F46E5]">{r}</Text>
                </View>
              ))}
            </View>
            {diceCount > 1 && (
              <View className="bg-white rounded-2xl px-8 py-4 flex flex-col items-center" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Text className="block text-xs text-gray-400 mb-1">总计</Text>
                <Text className="block text-3xl font-bold" style={{ color: '#4F46E5' }}>{total}</Text>
              </View>
            )}
          </>
        ) : (
          <View className="flex flex-col items-center opacity-30">
            <Dices size={64} color="#4F46E5" />
            <Text className="block text-sm text-gray-400 mt-4">点击下方按钮掷骰</Text>
          </View>
        )}
      </View>

      {/* 掷骰按钮 */}
      <View className="px-5 pb-8">
        <Button
          className="w-full h-12 rounded-2xl"
          onClick={roll}
          disabled={rolling}
          style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
        >
          <Text className="text-white font-semibold text-base">{rolling ? '掷骰中...' : '掷骰子'}</Text>
        </Button>
      </View>
    </View>
  )
}

export default DicePage
