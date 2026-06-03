import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer'
import { Switch } from '@/components/ui/switch'
import { Dices, ArrowLeft, Settings, X, Plus, Minus, Volume2, MousePointerClick, Smartphone } from 'lucide-react-taro'
import type { FC } from 'react'
import { DICE_COLORS, DICE_THEMES, DiceColor, DiceTheme } from '@/lib/three/dice'

import { PhysicsDice } from './components/PhysicsDice'
import type { PhysicsDiceHandle } from './components/PhysicsDice'

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
  const [selectedColor, setSelectedColor] = useState<DiceColor>(DICE_COLORS[0])
  const [selectedTheme, setSelectedTheme] = useState<DiceTheme>(DICE_THEMES[0])
  const [diceCount, setDiceCount] = useState(1)
  const [rollMode, setRollMode] = useState<RollMode>('tap')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [results, setResults] = useState<number[]>([])
  const [rolling, setRolling] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showCup, setShowCup] = useState(false)
  const [cupShaking, setCupShaking] = useState(false)
  const [cupLifting, setCupLifting] = useState(false)
  const physicsDiceRef = useRef<PhysicsDiceHandle>(null)
  const lastShakeTimeRef = useRef<number>(0)
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearShakeTimeouts = useCallback(() => {
    shakeTimeoutRef.current.forEach(clearTimeout)
    shakeTimeoutRef.current = []
  }, [])

  // 计算骰子总点数
  const total = results.reduce((sum, n) => sum + n, 0)

  const getCurrentConfigText = () => `${selectedDice.key} · ${diceCount}个骰子`
  const getCurrentModeText = () => rollMode === 'tap' ? '点击投掷' : '摇一摇投掷'

  // 播放音效（模拟）
  const playSound = useCallback((type: 'shake' | 'stop' | 'lift') => {
    if (!soundEnabled) return
    console.log(`🔊 播放音效: ${type}`)
  }, [soundEnabled])

  // 动画开始回调
  const handleAnimationStart = useCallback(() => {
    setRolling(true)
    setResults([])
  }, [])

  // 动画结束回调
  const handleAnimationEnd = useCallback(() => {
    setRolling(false)
  }, [])

  // 结果回调
  const handleResult = useCallback((newResults: number[]) => {
    setResults(newResults)
    playSound('stop')
  }, [playSound])

  // 摇一摇投掷
  const simulateShakeRoll = useCallback(() => {
    if (rolling) return
    setRolling(true)
    setResults([])
    setShowCup(true)
    setCupShaking(true)
    playSound('shake')

    clearShakeTimeouts()

    const t1 = setTimeout(() => {
      setCupShaking(false)
      setCupLifting(true)
      playSound('lift')

      const t2 = setTimeout(() => {
        setShowCup(false)
        physicsDiceRef.current?.throwDice()
      }, 800)
      shakeTimeoutRef.current.push(t2)
    }, 2000)
    shakeTimeoutRef.current.push(t1)
  }, [rolling, playSound, clearShakeTimeouts])

  // 投掷按钮处理
  const handleRoll = useCallback(() => {
    if (rollMode === 'shake') {
      simulateShakeRoll()
    } else {
      physicsDiceRef.current?.throwDice()
    }
  }, [rollMode, simulateShakeRoll])

  // 摇一摇监听
  useEffect(() => {
    if (rollMode !== 'shake') return

    if ([Taro.ENV_TYPE.WEAPP, Taro.ENV_TYPE.TT].includes(Taro.getEnv() as any)) {
      const handler = (res) => {
        const acceleration = Math.sqrt(res.x * res.x + res.y * res.y + res.z * res.z)
        const now = Date.now()
        if (acceleration > 15 && !rolling && now - lastShakeTimeRef.current > 2000) {
          lastShakeTimeRef.current = now
          simulateShakeRoll()
        }
      }
      Taro.onAccelerometerChange(handler)
      Taro.startAccelerometer({ interval: 'game' })
      return () => {
        Taro.offAccelerometerChange(handler)
        Taro.stopAccelerometer()
        clearShakeTimeouts()
      }
    }
  }, [rollMode, rolling, simulateShakeRoll, clearShakeTimeouts])

  const saveSettings = useCallback(() => {
    setShowSettings(false)
  }, [])

  return (
    <View className="flex flex-col min-h-screen" style={{ backgroundColor: selectedTheme.pageBg }}>
      {/* CSS动画定义（仅用于杯子） */}
      <View style={{ display: 'none' }}>
        <Text>{`
          @keyframes cupShake {
            0%, 100% { transform: translateX(0) rotate(0deg); }
            15% { transform: translateX(-15px) rotate(-12deg); }
            30% { transform: translateX(12px) rotate(10deg); }
            45% { transform: translateX(-10px) rotate(-8deg); }
            60% { transform: translateX(8px) rotate(6deg); }
            75% { transform: translateX(-5px) rotate(-4deg); }
            90% { transform: translateX(3px) rotate(2deg); }
          }
          @keyframes cupLift {
            0% { 
              transform: translateY(0) translateX(0) rotate(0deg) scale(1); 
              opacity: 1; 
            }
            30% {
              transform: translateY(-40px) translateX(10px) rotate(-5deg) scale(1.05);
              opacity: 0.9;
            }
            100% { 
              transform: translateY(-150px) translateX(60px) rotate(-20deg) scale(0.6); 
              opacity: 0; 
            }
          }
        `}</Text>
      </View>

      {/* 标题栏 */}
      <View className="sticky top-0 z-30" style={{ backgroundColor: selectedTheme.pageBg }}>
        <View className="flex items-center justify-between px-5 h-14">
          <View className="flex items-center gap-3">
            {Taro.getCurrentPages().length > 1 && (
              <View
                className="w-10 h-10 flex items-center justify-center rounded-full"
                onClick={() => Taro.navigateBack()}
              >
                <ArrowLeft size={20} color="#A0A0B0" />
              </View>
            )}
            <View className="flex items-center gap-2">
              <View className="w-9 h-9 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary to-amber-700">
                <Dices size={20} color="#fff" />
              </View>
              <Text className="text-xl font-bold" style={{ color: selectedTheme.textColor }}>骰子</Text>
            </View>
          </View>
          <View
            className="w-10 h-10 flex items-center justify-center rounded-full"
            onClick={() => setShowSettings(true)}
          >
            <Settings size={20} color="#A0A0B0" />
          </View>
        </View>
      </View>

      {/* 当前配置显示 */}
      <View className="px-4 pt-4">
        <View className="flex items-center justify-between px-4 py-3 rounded-2xl" style={{ backgroundColor: selectedTheme.key === 'white' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)' }}>
          <View className="flex items-center gap-3">
            <Dices size={20} color="#F59E0B" />
            <View>
              <Text className="block text-sm font-medium" style={{ color: selectedTheme.textColor }}>{getCurrentConfigText()}</Text>
              <Text className="block text-xs" style={{ color: selectedTheme.subTextColor }}>{getCurrentModeText()}</Text>
            </View>
          </View>
          {soundEnabled && <Volume2 size={16} color="#22c55e" />}
        </View>
      </View>

      {/* 主投掷区域 */}
      <View className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        {/* 杯子区域 */}
        {showCup && (
          <View
            className="mb-6"
            style={{
              width: '200px',
              height: '200px',
              animation: cupShaking
                ? 'cupShake 0.25s ease-in-out infinite'
                : cupLifting
                  ? 'cupLift 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                  : 'none',
            }}
          >
            {/* 杯子主体 */}
            <View
              className="relative w-full h-full rounded-b-3xl"
              style={{
                background: 'linear-gradient(180deg, #5C4033 0%, #3E2723 50%, #1A1A1A 100%)',
                boxShadow: '0 15px 35px rgba(0,0,0,0.4), inset 0 5px 15px rgba(255,255,255,0.1)',
              }}
            >
              {/* 顶部开口 */}
              <View
                className="absolute top-0 left-1/2 transform -translate-x-1/2"
                style={{
                  width: '140px',
                  height: '30px',
                  background: 'radial-gradient(ellipse at center, #2C1810 0%, #1A0F0A 100%)',
                  borderRadius: '50%',
                  boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.6)',
                }}
              />

              {/* 金属装饰环 */}
              <View
                className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
                style={{
                  width: '160px',
                  height: '8px',
                  background: 'linear-gradient(90deg, #8B7355 0%, #D4AF37 50%, #8B7355 100%)',
                  borderRadius: '4px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}
              />

              {/* 底部阴影 */}
              <View
                className="absolute -bottom-4 left-1/2 transform -translate-x-1/2"
                style={{
                  width: '180px',
                  height: '20px',
                  background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)',
                  borderRadius: '50%',
                }}
              />
            </View>
          </View>
        )}

        {/* 物理骰子组件 */}
        <View style={{ display: showCup ? 'none' : 'flex', width: '100%', height: '400px' }}>
          <PhysicsDice ref={physicsDiceRef} count={diceCount} color={selectedColor} theme={selectedTheme} onResult={handleResult} onAnimationStart={handleAnimationStart} onAnimationEnd={handleAnimationEnd} />
        </View>

        {/* 进度提示和结果展示（合并区域，始终展示） */}
        <View className="text-center mt-6">
          {results.length > 0 && (
            <>
              <Text className="block text-3xl font-bold mb-2" style={{ color: selectedTheme.textColor }}>
                {[...results].sort((a, b) => a - b).join(' · ')}
              </Text>
              {diceCount > 1 && <Text className="block text-sm" style={{ color: selectedTheme.subTextColor }}>总计: {total}</Text>}
            </>
          )}
        </View>
      </View>

      {/* 投掷按钮 */}
      <View className="px-4 pb-8">
        <Button
          className="w-full py-4 rounded-2xl text-lg font-bold bg-gradient-to-r from-amber-500 to-amber-600 border-0"
          style={{
            boxShadow: '0 10px 25px rgba(245, 158, 11, 0.3)',
          }}
          onClick={handleRoll}
          disabled={rolling}
        >
          {rolling ? (
            <Text className="text-white">投掷中...</Text>
          ) : rollMode === 'shake' ? (
            <View className="flex items-center justify-center gap-2">
              <Smartphone size={24} color="#fff" />
              <Text className="text-white">模拟摇晃</Text>
            </View>
          ) : (
            <Text className="text-white font-bold">开始投掷</Text>
          )}
        </Button>
      </View>

      {/* 设置面板 */}
      <Drawer open={showSettings} onOpenChange={setShowSettings}>
        <DrawerContent className="bg-gray-900">
          <DrawerHeader>
            <View className="flex items-center justify-between">
              <DrawerTitle className="text-white">投掷设置</DrawerTitle>
              <DrawerClose className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800">
                <X size={20} color="#A0A0B0" />
              </DrawerClose>
            </View>
          </DrawerHeader>
          <View className="p-6">
            {/* 骰子类型选择 */}
            <View className="mb-6">
              <Text className="block text-sm font-semibold text-gray-400 mb-3">选择骰子类型</Text>
              <View className="flex gap-2 overflow-x-auto pb-2">
                {DICE_TYPES.map((dice) => (
                  <View
                    key={dice.key}
                    className={`flex-shrink-0 px-4 py-2 rounded-full cursor-pointer transition-all ${
                      selectedDice.key === dice.key ? 'bg-amber-500 text-white' : 'bg-gray-800 text-gray-300'
                    }`}
                    onClick={() => setSelectedDice(dice)}
                  >
                    <Text className="text-sm font-medium">{dice.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 骰子颜色选择 */}
            <View className="mb-6">
              <Text className="block text-sm font-semibold text-gray-400 mb-3">骰子颜色</Text>
              <View className="flex gap-2 flex-wrap">
                {DICE_COLORS.map((color) => (
                  <View
                    key={color.key}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-all ${
                      selectedColor.key === color.key ? 'bg-amber-500 text-white' : 'bg-gray-800 text-gray-300'
                    }`}
                    onClick={() => setSelectedColor(color)}
                  >
                    <View
                      className="w-4 h-4 rounded-full border border-gray-500"
                      style={{
                        backgroundColor: `rgb(${color.bgColor[0]}, ${color.bgColor[1]}, ${color.bgColor[2]})`,
                      }}
                    />
                    <Text className="text-sm font-medium">{color.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 界面主题选择 */}
            <View className="mb-6">
              <Text className="block text-sm font-semibold text-gray-400 mb-3">界面主题</Text>
              <View className="flex gap-2 flex-wrap">
                {DICE_THEMES.map((theme) => (
                  <View
                    key={theme.key}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-all ${
                      selectedTheme.key === theme.key ? 'bg-amber-500 text-white' : 'bg-gray-800 text-gray-300'
                    }`}
                    onClick={() => setSelectedTheme(theme)}
                  >
                    <View
                      className="w-4 h-4 rounded-full border border-gray-500"
                      style={{
                        backgroundColor: theme.pageBg,
                      }}
                    />
                    <Text className="text-sm font-medium">{theme.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 骰子数量选择 */}
            <View className="mb-6">
              <Text className="block text-sm font-semibold text-gray-400 mb-3">
                选择骰子数量: <Text className="text-amber-400 font-bold">{diceCount}</Text>
              </Text>
              <View className="flex items-center gap-4">
                <View
                  className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center cursor-pointer"
                  onClick={() => setDiceCount(Math.max(1, diceCount - 1))}
                >
                  <Minus size={20} color="#A0A0B0" />
                </View>
                <View className="flex-1 h-3 bg-gray-800 rounded-full relative">
                  <View
                    className="absolute left-0 top-0 h-full bg-amber-500 rounded-full"
                    style={{ width: `${(diceCount / 10) * 100}%` }}
                  />
                </View>
                <View
                  className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center cursor-pointer"
                  onClick={() => setDiceCount(Math.min(10, diceCount + 1))}
                >
                  <Plus size={20} color="#A0A0B0" />
                </View>
              </View>
            </View>

            {/* 投掷方式选择 */}
            <View className="mb-6">
              <Text className="block text-sm font-semibold text-gray-400 mb-3">投掷方式</Text>
              <View className="flex flex-col gap-3">
                <View
                  className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer ${rollMode === 'tap' ? 'bg-amber-500 bg-opacity-20' : 'bg-gray-800'}`}
                  onClick={() => setRollMode('tap')}
                >
                  <View
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${rollMode === 'tap' ? 'border-amber-500' : 'border-gray-600'}`}
                  >
                    {rollMode === 'tap' && <View className="w-3 h-3 rounded-full bg-amber-500" />}
                  </View>
                  <View className="flex-1">
                    <Text className="block font-medium text-white">点击投掷</Text>
                    <Text className="block text-sm text-gray-400">点击按钮即可投掷骰子</Text>
                  </View>
                  <MousePointerClick size={20} color="#A0A0B0" />
                </View>

                <View
                  className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer ${rollMode === 'shake' ? 'bg-amber-500 bg-opacity-20' : 'bg-gray-800'}`}
                  onClick={() => setRollMode('shake')}
                >
                  <View
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${rollMode === 'shake' ? 'border-amber-500' : 'border-gray-600'}`}
                  >
                    {rollMode === 'shake' && <View className="w-3 h-3 rounded-full bg-amber-500" />}
                  </View>
                  <View className="flex-1">
                    <Text className="block font-medium text-white">摇一摇投掷</Text>
                    <Text className="block text-sm text-gray-400">摇动设备触发投掷，配合杯子动画</Text>
                  </View>
                  <Smartphone size={20} color="#A0A0B0" />
                </View>
              </View>
            </View>

            {/* 音效设置 */}
            <View className="mb-6">
              <Text className="block text-sm font-semibold text-gray-400 mb-3">音效设置</Text>
              <View className="flex items-center justify-between p-4 bg-gray-800 rounded-xl">
                <View>
                  <Text className="block font-medium text-white">开启音效</Text>
                  <Text className="block text-sm text-gray-400">摇晃、停止、掀开音效</Text>
                </View>
                <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
              </View>
            </View>

            {/* 保存按钮 */}
            <Button className="w-full py-4 rounded-xl text-base font-semibold bg-amber-500 border-0" onClick={saveSettings}>
              <Text className="text-white">保存设置</Text>
            </Button>
          </View>
        </DrawerContent>
      </Drawer>
    </View>
  )
}

export default DicePage
