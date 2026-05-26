import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect, useCallback, useRef } from 'react'
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

// D6骰子6个面对应的3D旋转角度
const D6_FACE_ROTATIONS: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },      // 正面
  2: { x: -90, y: 0 },    // 顶面
  3: { x: 0, y: 90 },     // 右面
  4: { x: 0, y: -90 },    // 左面
  5: { x: 90, y: 0 },     // 底面
  6: { x: 180, y: 0 },    // 背面
}

// D6骰子6个面的点位
const D6_DOTS: Record<number, number[][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
}

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

  // 3D骰子旋转状态
  const [diceRotations, setDiceRotations] = useState<Array<{ x: number; y: number; z: number }>>([])
  const [animating, setAnimating] = useState(false)
  const [showBounce, setShowBounce] = useState(false)
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 计算骰子总点数
  const total = results.reduce((sum, n) => sum + n, 0)

  const getCurrentConfigText = () => `${selectedDice.key} · ${diceCount}个骰子`
  const getCurrentModeText = () => rollMode === 'tap' ? '点击投掷' : '摇一摇投掷'

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

  // 3D投掷动画
  const perform3DRoll = useCallback((finalResults: number[]) => {
    if (animTimerRef.current) clearTimeout(animTimerRef.current)
    setAnimating(true)
    setShowBounce(false)

    // 快速旋转阶段：每100ms随机旋转
    let step = 0
    const totalSteps = 12
    const spinInterval = setInterval(() => {
      setDiceRotations(
        Array.from({ length: diceCount }, () => ({
          x: Math.random() * 720,
          y: Math.random() * 720,
          z: Math.random() * 720,
        }))
      )
      step++
      if (step >= totalSteps) {
        clearInterval(spinInterval)

        // 落到最终面
        const finalRotations = finalResults.map((result) => {
          if (selectedDice.key === 'D6') {
            const faceRotation = D6_FACE_ROTATIONS[result] || { x: 0, y: 0 }
            return { x: faceRotation.x + 360, y: faceRotation.y + 360, z: 0 }
          }
          // 其他骰子类型，随机最终角度
          return { x: 360, y: 360, z: 0 }
        })
        setDiceRotations(finalRotations)

        // 弹跳效果
        animTimerRef.current = setTimeout(() => {
          setAnimating(false)
          setShowBounce(true)
          playSound('stop')

          animTimerRef.current = setTimeout(() => {
            setShowBounce(false)
          }, 600)
        }, 400)
      }
    }, 80)
  }, [diceCount, selectedDice.key, playSound])

  // 点击投掷
  const performTapRoll = useCallback(() => {
    if (rolling) return
    setRolling(true)
    setResults([])
    playSound('shake')

    const finalResults = generateResults()

    // 3D旋转动画
    perform3DRoll(finalResults)

    setTimeout(() => {
      setResults(finalResults)
      setRolling(false)
    }, 1800)
  }, [rolling, generateResults, playSound, perform3DRoll])

  // 摇一摇投掷
  const simulateShakeRoll = useCallback(() => {
    if (rolling) return
    setRolling(true)
    setResults([])
    setShowCup(true)
    setCupShaking(true)
    playSound('shake')

    setTimeout(() => {
      setCupShaking(false)
      setCupLifting(true)
      playSound('lift')

      setTimeout(() => {
        const finalResults = generateResults()
        perform3DRoll(finalResults)

        setTimeout(() => {
          setResults(finalResults)
          setRolling(false)
          setCupLifting(false)
          setShowCup(false)
        }, 1800)
      }, 800)
    }, 2000)
  }, [rolling, generateResults, playSound, perform3DRoll])

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

    if ([Taro.ENV_TYPE.WEAPP, Taro.ENV_TYPE.TT].includes(Taro.getEnv() as any)) {
      Taro.onAccelerometerChange((res) => {
        const acceleration = Math.sqrt(res.x * res.x + res.y * res.y + res.z * res.z)
        if (acceleration > 15 && !rolling) {
          simulateShakeRoll()
        }
      })
      Taro.startAccelerometer({ interval: 'game' })
      return () => { Taro.stopAccelerometer() }
    }
  }, [rollMode, rolling, simulateShakeRoll])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current)
    }
  }, [])

  const saveSettings = useCallback(() => {
    setShowSettings(false)
  }, [])

  // 渲染D6骰子的点
  const renderD6Dots = (value: number) => {
    const dots = D6_DOTS[value] || []
    return dots.map((pos, i) => (
      <View
        key={i}
        className="absolute rounded-full bg-on-surface"
        style={{
          width: '18%',
          height: '18%',
          left: `${pos[0]}%`,
          top: `${pos[1]}%`,
          transform: 'translate(-50%, -50%)',
        }}
      />
    ))
  }

  // 渲染3D骰子
  const render3DDice = (result: number, index: number) => {
    const rotation = diceRotations[index] || { x: 0, y: 0, z: 0 }
    const isD6 = selectedDice.key === 'D6'

    return (
      <View
        key={index}
        className="relative"
        style={{
          perspective: '300px',
          width: '80px',
          height: '80px',
        }}
      >
        <View
          className={`w-full h-full ${showBounce ? 'animate-bounce' : ''}`}
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`,
            transition: animating ? 'none' : 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            animationDuration: '0.6s',
          }}
        >
          {isD6 ? (
            // D6 3D立方体 - 6个面
            renderD6Cube(result)
          ) : (
            // 其他骰子 - 3D翻转卡片
            renderGenericDice(result)
          )}
        </View>
      </View>
    )
  }

  // 渲染D6 3D立方体
  const renderD6Cube = (_targetValue: number) => {
    const size = 80
    const half = size / 2
    const faces = [
      { value: 1, transform: `translateZ(${half}px)` },
      { value: 6, transform: `rotateY(180deg) translateZ(${half}px)` },
      { value: 3, transform: `rotateY(90deg) translateZ(${half}px)` },
      { value: 4, transform: `rotateY(-90deg) translateZ(${half}px)` },
      { value: 2, transform: `rotateX(90deg) translateZ(${half}px)` },
      { value: 5, transform: `rotateX(-90deg) translateZ(${half}px)` },
    ]

    return (
      <>
        {faces.map((face) => (
          <View
            key={face.value}
            className="absolute flex items-center justify-center rounded-xl"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              transform: face.transform,
              backfaceVisibility: 'hidden',
              background: 'linear-gradient(145deg, #ffffff, #e8e8e8)',
              boxShadow: 'inset 1px 1px 3px rgba(255,255,255,0.9), inset -1px -1px 3px rgba(0,0,0,0.1)',
              border: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            {renderD6Dots(face.value)}
          </View>
        ))}
      </>
    )
  }

  // 渲染其他类型骰子
  const renderGenericDice = (value: number) => {
    return (
      <View
        className="absolute flex items-center justify-center rounded-xl"
        style={{
          width: '80px',
          height: '80px',
          backfaceVisibility: 'hidden',
          background: 'linear-gradient(145deg, #ffffff, #e8e8e8)',
          boxShadow: 'inset 1px 1px 3px rgba(255,255,255,0.9), inset -1px -1px 3px rgba(0,0,0,0.1)',
          border: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <Text className="text-2xl font-bold text-on-surface">{value}</Text>
        <Text className="text-xs text-on-surface-variant absolute bottom-1">{selectedDice.key}</Text>
      </View>
    )
  }

  // 渲染初始骰子（未投掷状态）
  const renderIdleDice = () => {
    const isD6 = selectedDice.key === 'D6'
    return (
      <View
        className="relative"
        style={{ perspective: '300px', width: '80px', height: '80px' }}
      >
        <View
          className="w-full h-full"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'rotateX(-15deg) rotateY(20deg)',
          }}
        >
          {isD6 ? (
            renderD6Cube(1)
          ) : (
            <View
              className="absolute flex items-center justify-center rounded-xl"
              style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(145deg, #ffffff, #e8e8e8)',
                boxShadow: 'inset 1px 1px 3px rgba(255,255,255,0.9), inset -1px -1px 3px rgba(0,0,0,0.1), 4px 4px 10px rgba(0,0,0,0.12)',
                border: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <Text className="text-2xl font-bold text-on-surface">?</Text>
              <Text className="text-xs text-on-surface-variant absolute bottom-1">{selectedDice.key}</Text>
            </View>
          )}
        </View>
      </View>
    )
  }

  return (
    <View className="flex flex-col min-h-screen bg-background">
      {/* CSS动画定义 */}
      <View style={{ display: 'none' }}>
        <Text>{`
          @keyframes dice3dSpin {
            0% { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
            25% { transform: rotateX(180deg) rotateY(90deg) rotateZ(45deg); }
            50% { transform: rotateX(360deg) rotateY(180deg) rotateZ(90deg); }
            75% { transform: rotateX(540deg) rotateY(270deg) rotateZ(135deg); }
            100% { transform: rotateX(720deg) rotateY(360deg) rotateZ(180deg); }
          }
          @keyframes cupShake {
            0%, 100% { transform: translateX(0) rotate(0deg); }
            20% { transform: translateX(-8px) rotate(-5deg); }
            40% { transform: translateX(8px) rotate(5deg); }
            60% { transform: translateX(-6px) rotate(-3deg); }
            80% { transform: translateX(6px) rotate(3deg); }
          }
          @keyframes cupLift {
            0% { transform: translateY(0) scale(1); opacity: 1; }
            50% { transform: translateY(-20px) scale(1.05); opacity: 0.8; }
            100% { transform: translateY(-80px) scale(0.8); opacity: 0; }
          }
          @keyframes diceBounce {
            0% { transform: scale(1); }
            30% { transform: scale(1.15); }
            50% { transform: scale(0.95); }
            70% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          @keyframes diceGlow {
            0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
            50% { box-shadow: 0 0 20px 8px rgba(245, 158, 11, 0.15); }
            100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
          }
        `}</Text>
      </View>

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
              <Text className="block text-sm font-medium text-on-surface">{getCurrentConfigText()}</Text>
              <Text className="block text-xs text-on-surface-variant">{getCurrentModeText()}</Text>
            </View>
          </View>
          {soundEnabled && <Volume2 size={16} color="#22c55e" />}
        </View>
      </View>

      {/* 主投掷区域 */}
      <View className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        {/* 状态提示 */}
        <Text className="block text-sm text-on-surface-variant mb-6 text-center">
          {rolling
            ? (showCup ? '摇晃杯子中...' : '骰子旋转中...')
            : (results.length > 0 ? '投掷完成！' : '点击下方按钮开始掷骰')
          }
        </Text>

        {/* 杯子区域 */}
        {showCup && (
          <View
            className="mb-6"
            style={{
              width: '160px',
              height: '160px',
              animation: cupShaking ? 'cupShake 0.3s ease-in-out infinite' : cupLifting ? 'cupLift 0.8s ease-out forwards' : 'none',
            }}
          >
            <View className="w-full h-full rounded-full bg-gradient-to-br from-primary to-amber-700 flex items-center justify-center shadow-lg">
              <Text className="text-5xl">🪄</Text>
            </View>
          </View>
        )}

        {/* 3D骰子展示区域 */}
        {!showCup && (
          <View
            className="flex flex-wrap justify-center gap-4 mb-6 min-h-28 items-center"
            style={{
              animation: showBounce ? 'diceGlow 0.6s ease-out' : 'none',
            }}
          >
            {results.length > 0 ? (
              results.map((result, index) => render3DDice(result, index))
            ) : (
              renderIdleDice()
            )}
          </View>
        )}

        {/* 结果展示区域 */}
        {results.length > 0 && !showCup && (
          <View className="text-center">
            <Text className="block text-lg font-bold text-primary mb-2">投掷结果</Text>
            <Text className="block text-3xl font-bold text-on-surface mb-2">{results.join(' · ')}</Text>
            {diceCount > 1 && (
              <Text className="block text-sm text-on-surface-variant">总计: {total}</Text>
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
                <Text className="block text-sm font-semibold text-on-surface-variant mb-3">选择骰子类型</Text>
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
                <Text className="block text-sm font-semibold text-on-surface-variant mb-3">
                  选择骰子数量: <Text className="text-primary font-bold">{diceCount}</Text>
                </Text>
                <View className="flex items-center gap-4">
                  <View
                    className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center cursor-pointer"
                    onClick={() => setDiceCount(Math.max(1, diceCount - 1))}
                  >
                    <Minus size={20} color="#57534E" />
                  </View>
                  <View className="flex-1 h-3 bg-surface-container rounded-full relative">
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
                <Text className="block text-sm font-semibold text-on-surface-variant mb-3">投掷方式</Text>
                <View className="flex flex-col gap-3">
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
                      <Text className="block font-medium text-on-surface">点击投掷</Text>
                      <Text className="block text-sm text-on-surface-variant">点击按钮即可投掷骰子</Text>
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
                      <Text className="block font-medium text-on-surface">摇一摇投掷</Text>
                      <Text className="block text-sm text-on-surface-variant">摇动设备触发投掷，配合杯子动画</Text>
                    </View>
                    <Smartphone size={20} color="#57534E" />
                  </View>
                </View>
              </View>

              {/* 音效设置 */}
              <View className="mb-6">
                <Text className="block text-sm font-semibold text-on-surface-variant mb-3">音效设置</Text>
                <View className="flex items-center justify-between p-4 bg-surface-container rounded-xl">
                  <View>
                    <Text className="block font-medium text-on-surface">开启音效</Text>
                    <Text className="block text-sm text-on-surface-variant">摇晃、停止、掀开音效</Text>
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
