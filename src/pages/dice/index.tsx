import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Dices, ArrowLeft, Settings, X, Plus, Minus, Volume2, MousePointerClick, Smartphone } from 'lucide-react-taro'
import type { FC } from 'react'

const DICE_TYPES = [
  { key: 'D4', label: 'D4', max: 4 },
  { key: 'D6', label: 'D6', max: 6 },
  { key: 'D8', label: 'D8', max: 8 },
  { key: 'D10', label: 'D10', max: 10 },
  { key: 'D12', label: 'D12', max: 12 },
  { key: 'D20', label: 'D20', max: 20 },
]

type RollMode = 'tap' | 'shake'

const DicePage: FC = () => {
  const [selectedDice, setSelectedDice] = useState(DICE_TYPES[1])
  const [diceCount, setDiceCount] = useState(1)
  const [rollMode, setRollMode] = useState<RollMode>('tap')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [results, setResults] = useState<number[]>([])
  const [rolling, setRolling] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showCup, setShowCup] = useState(false)
  const [cupShaking, setCupShaking] = useState(false)
  const [cupLifting, setCupLifting] = useState(false)



  // 骰子Unicode符号
  const diceSymbols = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

  // 计算骰子总点数
  const total = results.reduce((sum, n) => sum + n, 0)

  // 更新当前配置显示文本
  const getCurrentConfigText = () => {
    return `${selectedDice.key} · ${diceCount}个骰子`
  }

  const getCurrentModeText = () => {
    return rollMode === 'tap' ? '点击投掷' : '摇一摇投掷'
  }

  // 播放音效（模拟）
  const playSound = useCallback((type: 'shake' | 'stop' | 'lift') => {
    if (!soundEnabled) return
    console.log(`🔊 播放音效: ${type}`)
  }, [soundEnabled])

  // 生成骰子结果
  const generateResults = useCallback(() => {
    const newResults: number[] = []
    for (let i = 0; i < diceCount; i++) {
      newResults.push(Math.floor(Math.random() * selectedDice.max) + 1)
    }
    return newResults
  }, [diceCount, selectedDice.max])

  // 显示结果
  const displayResults = useCallback((newResults: number[]) => {
    setResults(newResults)
    setRolling(false)
    setCupShaking(false)
    setCupLifting(false)
    setShowCup(false)
  }, [])

  // 点击投掷
  const performTapRoll = useCallback(() => {
    if (rolling) return

    setRolling(true)
    setResults([])
    playSound('shake')

    // 模拟旋转过程
    let rotationCount = 0
    const rotationInterval = setInterval(() => {
      const tempResults = generateResults()
      setResults(tempResults)
      rotationCount++
      
      if (rotationCount >= 15) {
        clearInterval(rotationInterval)
        playSound('stop')
        
        setTimeout(() => {
          const finalResults = generateResults()
          displayResults(finalResults)
        }, 600)
      }
    }, 100)
  }, [rolling, generateResults, playSound, displayResults])

  // 模拟摇一摇投掷
  const simulateShakeRoll = useCallback(() => {
    if (rolling) return

    setRolling(true)
    setResults([])
    setShowCup(true)
    setCupShaking(true)
    playSound('shake')

    // 模拟摇晃过程
    setTimeout(() => {
      setCupShaking(false)
      setCupLifting(true)
      playSound('lift')

      setTimeout(() => {
        const finalResults = generateResults()
        displayResults(finalResults)
      }, 800)
    }, 2000)
  }, [rolling, generateResults, playSound, displayResults])

  // 投掷按钮处理
  const handleRoll = useCallback(() => {
    if (rollMode === 'shake') {
      simulateShakeRoll()
    } else {
      performTapRoll()
    }
  }, [rollMode, simulateShakeRoll, performTapRoll])

  // 摇一摇监听
  useEffect(() => {
    if (rollMode !== 'shake' || rolling) return

    const handleShake = () => {
      if (!rolling && rollMode === 'shake') {
        simulateShakeRoll()
      }
    }

    // 微信小程序加速度传感器
    if ([Taro.ENV_TYPE.WEAPP, Taro.ENV_TYPE.TT].includes(Taro.getEnv() as any)) {
      Taro.onAccelerometerChange((res) => {
        const acceleration = Math.sqrt(res.x * res.x + res.y * res.y + res.z * res.z)
        if (acceleration > 15 && !rolling) {
          handleShake()
        }
      })
      
      Taro.startAccelerometer({ interval: 'game' })
      
      return () => {
        Taro.stopAccelerometer()
      }
    }
  }, [rollMode, rolling, simulateShakeRoll])

  // 保存设置
  const saveSettings = useCallback(() => {
    setShowSettings(false)
  }, [])

  return (
    <View className="flex flex-col min-h-screen bg-background">
      {/* 标题栏 */}
      <View className="sticky top-0 z-30 bg-surface-container-lowest">
        <View className="flex items-center justify-between px-5 h-14">
          <View className="flex items-center gap-3">
            {Taro.getCurrentPages().length > 1 && (
              <View className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container" onClick={() => Taro.navigateBack()}>
                <ArrowLeft size={20} color="#57534E" />
              </View>
            )}
            <View className="flex items-center gap-2">
              <View className="w-9 h-9 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary to-amber-700">
                <Dices size={20} color="#fff" />
              </View>
              <Text className="text-xl font-bold text-on-surface">骰子</Text>
            </View>
          </View>
          <View 
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container"
            onClick={() => setShowSettings(true)}
          >
            <Settings size={20} color="#57534E" />
          </View>
        </View>
      </View>

      {/* 当前配置显示 */}
      <View className="px-4 pt-4">
        <View className="flex items-center justify-between px-4 py-3 bg-surface-container rounded-2xl">
          <View className="flex items-center gap-3">
            <Dices size={20} color="#F59E0B" />
            <View>
              <Text className="text-sm font-medium text-on-surface">{getCurrentConfigText()}</Text>
              <Text className="text-xs text-on-surface-variant">{getCurrentModeText()}</Text>
            </View>
          </View>
          {soundEnabled && <Volume2 size={16} color="#22c55e" />}
        </View>
      </View>

      {/* 主投掷区域 */}
      <View className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        {/* 状态提示 */}
        <Text className="text-sm text-on-surface-variant mb-4 text-center">
          {rolling 
            ? (showCup ? '🫗 杯子摇晃中...' : '🎲 骰子旋转中...') 
            : (results.length > 0 ? '✨ 投掷完成！' : '点击下方按钮开始掷骰')
          }
        </Text>

        {/* 杯子区域 */}
        {showCup && (
          <View className="w-48 h-48 mb-6">
            <View className={`${cupShaking ? 'animate-pulse' : ''} ${cupLifting ? 'opacity-0' : 'opacity-100'} transition-opacity duration-800`}>
              {/* 简单的杯子UI示意 */}
              <View className="w-full h-full rounded-full bg-gradient-to-br from-primary to-amber-700 flex items-center justify-center shadow-lg">
                <Text className="text-4xl">🫗</Text>
              </View>
            </View>
          </View>
        )}

        {/* 骰子展示区域 */}
        {!showCup && (
          <View className="flex flex-wrap justify-center gap-4 mb-6 min-h-[100px] items-center">
            {results.length > 0 ? (
              results.map((result, index) => {
                const symbolIndex = Math.min(result - 1, diceSymbols.length - 1)
                const symbol = diceSymbols[symbolIndex] || result
                return (
                  <View 
                    key={index}
                    className={`w-20 h-20 rounded-xl flex items-center justify-center ${rolling ? 'animate-pulse' : ''}`}
                    style={{
                      background: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
                      boxShadow: 'inset 2px 2px 5px rgba(255,255,255,0.8), inset -2px -2px 5px rgba(0,0,0,0.1), 4px 4px 10px rgba(0,0,0,0.15)'
                    }}
                  >
                    <Text className="text-3xl font-bold text-on-surface">{symbol}</Text>
                  </View>
                )
              })
            ) : (
              <View 
                className="w-20 h-20 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
                  boxShadow: 'inset 2px 2px 5px rgba(255,255,255,0.8), inset -2px -2px 5px rgba(0,0,0,0.1), 4px 4px 10px rgba(0,0,0,0.15)'
                }}
              >
                <Text className="text-3xl">⚀</Text>
              </View>
            )}
          </View>
        )}

        {/* 结果展示区域 */}
        {results.length > 0 && !showCup && (
          <View className="text-center">
            <Text className="text-lg font-bold text-primary mb-2">投掷结果</Text>
            <Text className="text-3xl font-bold text-on-surface mb-2">{results.join(' · ')}</Text>
            {diceCount > 1 && (
              <Text className="text-sm text-on-surface-variant">总计: {total}</Text>
            )}
          </View>
        )}
      </View>

      {/* 投掷按钮 */}
      <View className="px-4 pb-8">
        <Button
          className="w-full py-4 rounded-2xl text-lg font-bold"
          style={{
            boxShadow: '0 10px 25px rgba(245, 158, 11, 0.2)'
          }}
          onClick={handleRoll}
          disabled={rolling}
        >
          {rolling ? (
            <Text className="text-white">投掷中...</Text>
          ) : (rollMode === 'shake' ? (
            <View className="flex items-center justify-center gap-2">
              <Smartphone size={24} color="#fff" />
              <Text className="text-white">模拟摇晃</Text>
            </View>
          ) : (
            <Text className="text-white">开始投掷</Text>
          ))}
        </Button>
      </View>

      {/* 设置面板 */}
      {showSettings && (
        <View className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center">
          <View className="bg-surface rounded-t-3xl w-full max-h-[80vh] overflow-y-auto">
            <View className="p-6">
              {/* 模态框标题 */}
              <View className="flex items-center justify-between mb-6">
                <Text className="text-xl font-bold text-on-surface">投掷设置</Text>
                <View 
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container"
                  onClick={() => setShowSettings(false)}
                >
                  <X size={20} color="#57534E" />
                </View>
              </View>

              {/* 骰子类型选择 */}
              <View className="mb-6">
                <Text className="text-sm font-semibold text-on-surface-variant mb-3">选择骰子类型</Text>
                <View className="flex gap-2 overflow-x-auto pb-2">
                  {DICE_TYPES.map((dice) => (
                    <View
                      key={dice.key}
                      className={`flex-shrink-0 px-4 py-2 rounded-full cursor-pointer transition-all ${
                        selectedDice.key === dice.key 
                          ? 'bg-primary text-white' 
                          : 'bg-surface-container text-on-surface-variant'
                      }`}
                      onClick={() => setSelectedDice(dice)}
                    >
                      <Text className="text-sm font-medium">{dice.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* 骰子数量选择 */}
              <View className="mb-6">
                <Text className="text-sm font-semibold text-on-surface-variant mb-3">
                  选择骰子数量: <Text className="text-primary font-bold">{diceCount}</Text>
                </Text>
                <View className="flex items-center gap-4">
                  <View
                    className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center cursor-pointer"
                    onClick={() => setDiceCount(Math.max(1, diceCount - 1))}
                  >
                    <Minus size={20} color="#57534E" />
                  </View>
                  <View className="flex-1 h-3 bg-surface-container rounded-full">
                    <View 
                      className="absolute left-0 top-0 h-full bg-primary rounded-full" 
                      style={{ width: `${(diceCount / 10) * 100}%` }}
                    />
                  </View>
                  <View
                    className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center cursor-pointer"
                    onClick={() => setDiceCount(Math.min(10, diceCount + 1))}
                  >
                    <Plus size={20} color="#57534E" />
                  </View>
                </View>
              </View>

              {/* 投掷方式选择 */}
              <View className="mb-6">
                <Text className="text-sm font-semibold text-on-surface-variant mb-3">投掷方式</Text>
                <View className="space-y-3">
                  <View 
                    className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer ${
                      rollMode === 'tap' ? 'bg-primary-container' : 'bg-surface-container'
                    }`}
                    onClick={() => setRollMode('tap')}
                  >
                    <View
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        rollMode === 'tap' ? 'border-primary' : 'border-outline'
                      }`}
                    >
                      {rollMode === 'tap' && <View className="w-3 h-3 rounded-full bg-primary" />}
                    </View>
                    <View className="flex-1">
                      <Text className="font-medium text-on-surface">点击投掷</Text>
                      <Text className="text-sm text-on-surface-variant">点击按钮即可投掷骰子</Text>
                    </View>
                    <MousePointerClick size={20} color="#57534E" />
                  </View>
                  
                  <View 
                    className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer ${
                      rollMode === 'shake' ? 'bg-primary-container' : 'bg-surface-container'
                    }`}
                    onClick={() => setRollMode('shake')}
                  >
                    <View
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        rollMode === 'shake' ? 'border-primary' : 'border-outline'
                      }`}
                    >
                      {rollMode === 'shake' && <View className="w-3 h-3 rounded-full bg-primary" />}
                    </View>
                    <View className="flex-1">
                      <Text className="font-medium text-on-surface">摇一摇投掷</Text>
                      <Text className="text-sm text-on-surface-variant">摇动设备触发投掷，配合杯子动画</Text>
                    </View>
                    <Smartphone size={20} color="#57534E" />
                  </View>
                </View>
              </View>

              {/* 音效设置 */}
              <View className="mb-6">
                <Text className="text-sm font-semibold text-on-surface-variant mb-3">音效设置</Text>
                <View className="flex items-center justify-between p-4 bg-surface-container rounded-xl">
                  <View>
                    <Text className="font-medium text-on-surface">开启音效</Text>
                    <Text className="text-sm text-on-surface-variant">摇晃、停止、掀开音效</Text>
                  </View>
                  <View
                    className={`w-12 h-7 rounded-full relative cursor-pointer ${soundEnabled ? 'bg-primary' : 'bg-surface-container-highest'}`}
                    onClick={() => setSoundEnabled(!soundEnabled)}
                  >
                    <View 
                      className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow ${
                        soundEnabled ? 'right-1' : 'left-1'
                      }`}
                    />
                  </View>
                </View>
              </View>

              {/* 保存按钮 */}
              <Button
                className="w-full py-4 rounded-xl text-base font-semibold"
                onClick={saveSettings}
              >
                <Text className="text-white">保存设置</Text>
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

export default DicePage
