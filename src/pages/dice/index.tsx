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
  const [rollMode, setRollMode] = useState&lt;RollMode&gt;('tap')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [results, setResults] = useState&lt;number[]&gt;([])
  const [rolling, setRolling] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showCup, setShowCup] = useState(false)
  const [cupShaking, setCupShaking] = useState(false)
  const [cupLifting, setCupLifting] = useState(false)
  const [rotationAngles, setRotationAngles] = useState&lt;{ x: number; y: number; z: number }[]&gt;([])

  // 骰子Unicode符号
  const diceSymbols = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

  // 计算骰子总点数
  const total = results.reduce((sum, n) =&gt; sum + n, 0)

  // 更新当前配置显示文本
  const getCurrentConfigText = () =&gt; {
    return `${selectedDice.key} · ${diceCount}个骰子`
  }

  const getCurrentModeText = () =&gt; {
    return rollMode === 'tap' ? '点击投掷' : '摇一摇投掷'
  }

  // 播放音效（模拟）
  const playSound = useCallback((type: 'shake' | 'stop' | 'lift') =&gt; {
    if (!soundEnabled) return
    console.log(`🔊 播放音效: ${type}`)
  }, [soundEnabled])

  // 生成骰子结果
  const generateResults = useCallback(() =&gt; {
    const newResults: number[] = []
    for (let i = 0; i &lt; diceCount; i++) {
      newResults.push(Math.floor(Math.random() * selectedDice.max) + 1)
    }
    return newResults
  }, [diceCount, selectedDice.max])

  // 生成随机3D旋转角度
  const generateRotationAngles = useCallback(() =&gt; {
    const angles: { x: number; y: number; z: number }[] = []
    for (let i = 0; i &lt; diceCount; i++) {
      angles.push({
        x: Math.random() * 360 * 5,
        y: Math.random() * 360 * 5,
        z: Math.random() * 360 * 3
      })
    }
    return angles
  }, [diceCount])

  // 显示结果
  const displayResults = useCallback((newResults: number[]) =&gt; {
    setResults(newResults)
    setRolling(false)
    setCupShaking(false)
    setCupLifting(false)
    setShowCup(false)
    
    // 最终角度：随机但看起来稳定
    const finalAngles = newResults.map(() =&gt; ({
      x: Math.floor(Math.random() * 30) - 15,
      y: Math.floor(Math.random() * 30) - 15,
      z: Math.floor(Math.random() * 20) - 10
    }))
    setRotationAngles(finalAngles)
  }, [])

  // 点击投掷
  const performTapRoll = useCallback(() =&gt; {
    if (rolling) return

    setRolling(true)
    setResults([])
    playSound('shake')

    // 初始疯狂旋转
    const initialAngles = generateRotationAngles()
    setRotationAngles(initialAngles)

    // 模拟旋转过程
    let rotationCount = 0
    const rotationInterval = setInterval(() =&gt; {
      const tempResults = generateResults()
      setResults(tempResults)
      rotationCount++
      
      if (rotationCount &gt;= 20) {
        clearInterval(rotationInterval)
        playSound('stop')
        
        setTimeout(() =&gt; {
          const finalResults = generateResults()
          displayResults(finalResults)
        }, 500)
      }
    }, 80)
  }, [rolling, generateResults, playSound, displayResults, generateRotationAngles])

  // 模拟摇一摇投掷
  const simulateShakeRoll = useCallback(() =&gt; {
    if (rolling) return

    setRolling(true)
    setResults([])
    setShowCup(true)
    setCupShaking(true)
    playSound('shake')

    // 模拟摇晃过程
    setTimeout(() =&gt; {
      setCupShaking(false)
      setCupLifting(true)
      playSound('lift')

      setTimeout(() =&gt; {
        const finalResults = generateResults()
        displayResults(finalResults)
      }, 800)
    }, 2000)
  }, [rolling, generateResults, playSound, displayResults])

  // 投掷按钮处理
  const handleRoll = useCallback(() =&gt; {
    if (rollMode === 'shake') {
      simulateShakeRoll()
    } else {
      performTapRoll()
    }
  }, [rollMode, simulateShakeRoll, performTapRoll])

  // 摇一摇监听
  useEffect(() =&gt; {
    if (rollMode !== 'shake' || rolling) return

    const handleShake = () =&gt; {
      if (!rolling &amp;&amp; rollMode === 'shake') {
        simulateShakeRoll()
      }
    }

    // 微信小程序加速度传感器
    if ([Taro.ENV_TYPE.WEAPP, Taro.ENV_TYPE.TT].includes(Taro.getEnv() as any)) {
      Taro.onAccelerometerChange((res) =&gt; {
        const acceleration = Math.sqrt(res.x * res.x + res.y * res.y + res.z * res.z)
        if (acceleration &gt; 15 &amp;&amp; !rolling) {
          handleShake()
        }
      })
      
      Taro.startAccelerometer({ interval: 'game' })
      
      return () =&gt; {
        Taro.stopAccelerometer()
      }
    }
  }, [rollMode, rolling, simulateShakeRoll])

  // 保存设置
  const saveSettings = useCallback(() =&gt; {
    setShowSettings(false)
  }, [])

  // 骰子3D组件
  const Dice3D = ({ value, index }: { value: number; index: number }) =&gt; {
    const symbolIndex = Math.min(value - 1, diceSymbols.length - 1)
    const symbol = diceSymbols[symbolIndex] || value
    const angle = rotationAngles[index] || { x: 0, y: 0, z: 0 }

    return (
      &lt;View 
        key={index}
        className="w-20 h-20 flex items-center justify-center"
        style={{
          perspective: '400px'
        }}
      &gt;
        &lt;View
          style={{
            transform: `rotateX(${angle.x}deg) rotateY(${angle.y}deg) rotateZ(${angle.z}deg)`,
            transformStyle: 'preserve-3d',
            transition: rolling ? 'none' : 'transform 0.5s ease-out'
          }}
          className="w-full h-full relative"
        &gt;
          {/* 前面 */}
          &lt;View
            className="absolute inset-0 rounded-xl flex items-center justify-center"
            style={{
              transform: 'translateZ(40px)',
              background: 'linear-gradient(145deg, #ffffff, #e8e8e8)',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.05)'
            }}
          &gt;
            &lt;Text className="text-3xl font-bold text-gray-800"&gt;{symbol}&lt;/Text&gt;
          &lt;/View&gt;
          
          {/* 后面 */}
          &lt;View
            className="absolute inset-0 rounded-xl flex items-center justify-center"
            style={{
              transform: 'rotateY(180deg) translateZ(40px)',
              background: 'linear-gradient(145deg, #d8d8d8, #c8c8c8)',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.1)'
            }}
          &gt;
            &lt;Text className="text-3xl font-bold text-gray-700"&gt;{symbol}&lt;/Text&gt;
          &lt;/View&gt;
          
          {/* 右面 */}
          &lt;View
            className="absolute inset-0 rounded-xl flex items-center justify-center"
            style={{
              transform: 'rotateY(90deg) translateZ(40px)',
              background: 'linear-gradient(145deg, #e0e0e0, #d0d0d0)',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.08)'
            }}
          &gt;
            &lt;Text className="text-3xl font-bold text-gray-750"&gt;{symbol}&lt;/Text&gt;
          &lt;/View&gt;
          
          {/* 左面 */}
          &lt;View
            className="absolute inset-0 rounded-xl flex items-center justify-center"
            style={{
              transform: 'rotateY(-90deg) translateZ(40px)',
              background: 'linear-gradient(145deg, #e5e5e5, #d5d5d5)',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.08)'
            }}
          &gt;
            &lt;Text className="text-3xl font-bold text-gray-750"&gt;{symbol}&lt;/Text&gt;
          &lt;/View&gt;
          
          {/* 上面 */}
          &lt;View
            className="absolute inset-0 rounded-xl flex items-center justify-center"
            style={{
              transform: 'rotateX(90deg) translateZ(40px)',
              background: 'linear-gradient(145deg, #f0f0f0, #e0e0e0)',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.05)'
            }}
          &gt;
            &lt;Text className="text-3xl font-bold text-gray-750"&gt;{symbol}&lt;/Text&gt;
          &lt;/View&gt;
          
          {/* 下面 */}
          &lt;View
            className="absolute inset-0 rounded-xl flex items-center justify-center"
            style={{
              transform: 'rotateX(-90deg) translateZ(40px)',
              background: 'linear-gradient(145deg, #d5d5d5, #c5c5c5)',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.12)'
            }}
          &gt;
            &lt;Text className="text-3xl font-bold text-gray-750"&gt;{symbol}&lt;/Text&gt;
          &lt;/View&gt;
        &lt;/View&gt;
      &lt;/View&gt;
    )
  }

  return (
    &lt;View className="flex flex-col min-h-screen bg-background"&gt;
      {/* 标题栏 */}
      &lt;View className="sticky top-0 z-30 bg-surface-container-lowest"&gt;
        &lt;View className="flex items-center justify-between px-5 h-14"&gt;
          &lt;View className="flex items-center gap-3"&gt;
            {Taro.getCurrentPages().length &gt; 1 &amp;&amp; (
              &lt;View className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container" onClick={() =&gt; Taro.navigateBack()}&gt;
                &lt;ArrowLeft size={20} color="#57534E" /&gt;
              &lt;/View&gt;
            )}
            &lt;View className="flex items-center gap-2"&gt;
              &lt;View className="w-9 h-9 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary to-amber-700"&gt;
                &lt;Dices size={20} color="#fff" /&gt;
              &lt;/View&gt;
              &lt;Text className="text-xl font-bold text-on-surface"&gt;骰子&lt;/Text&gt;
            &lt;/View&gt;
          &lt;/View&gt;
          &lt;View 
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container"
            onClick={() =&gt; setShowSettings(true)}
          &gt;
            &lt;Settings size={20} color="#57534E" /&gt;
          &lt;/View&gt;
        &lt;/View&gt;
      &lt;/View&gt;

      {/* 当前配置显示 */}
      &lt;View className="px-4 pt-4"&gt;
        &lt;View className="flex items-center justify-between px-4 py-3 bg-surface-container rounded-2xl"&gt;
          &lt;View className="flex items-center gap-3"&gt;
            &lt;Dices size={20} color="#F59E0B" /&gt;
            &lt;View&gt;
              &lt;Text className="text-sm font-medium text-on-surface"&gt;{getCurrentConfigText()}&lt;/Text&gt;
              &lt;Text className="text-xs text-on-surface-variant"&gt;{getCurrentModeText()}&lt;/Text&gt;
            &lt;/View&gt;
          &lt;/View&gt;
          {soundEnabled &amp;&amp; &lt;Volume2 size={16} color="#22c55e" /&gt;}
        &lt;/View&gt;
      &lt;/View&gt;

      {/* 主投掷区域 */}
      &lt;View className="flex-1 flex flex-col items-center justify-center px-4 py-6"&gt;
        {/* 状态提示 */}
        &lt;Text className="text-sm text-on-surface-variant mb-4 text-center"&gt;
          {rolling 
            ? (showCup ? '🫗 杯子摇晃中...' : '🎲 骰子3D旋转中...') 
            : (results.length &gt; 0 ? '✨ 投掷完成！' : '点击下方按钮开始掷骰')
          }
        &lt;/Text&gt;

        {/* 杯子区域 */}
        {showCup &amp;&amp; (
          &lt;View className="w-48 h-48 mb-6"&gt;
            &lt;View className={`${cupShaking ? 'animate-pulse' : ''} ${cupLifting ? 'opacity-0' : 'opacity-100'} transition-opacity duration-800`}&gt;
              {/* 简单的杯子UI示意 */}
              &lt;View className="w-full h-full rounded-full bg-gradient-to-br from-primary to-amber-700 flex items-center justify-center shadow-lg"&gt;
                &lt;Text className="text-4xl"&gt;🫗&lt;/Text&gt;
              &lt;/View&gt;
            &lt;/View&gt;
          &lt;/View&gt;
        )}

        {/* 骰子展示区域 - 3D效果 */}
        {!showCup &amp;&amp; (
          &lt;View className="flex flex-wrap justify-center gap-6 mb-6 min-h-[120px] items-center" style={{ perspective: '800px' }}&gt;
            {results.length &gt; 0 ? (
              results.map((result, index) =&gt; (
                &lt;Dice3D key={index} value={result} index={index} /&gt;
              ))
            ) : (
              // 默认展示骰子
              &lt;View className="w-20 h-20 flex items-center justify-center" style={{ perspective: '400px' }}&gt;
                &lt;View className="w-full h-full relative" style={{ transformStyle: 'preserve-3d', transform: 'rotateX(-20deg) rotateY(20deg)' }}&gt;
                  &lt;View
                    className="absolute inset-0 rounded-xl flex items-center justify-center"
                    style={{
                      transform: 'translateZ(40px)',
                      background: 'linear-gradient(145deg, #ffffff, #e8e8e8)',
                      boxShadow: 'inset 0 0 20px rgba(0,0,0,0.05)'
                    }}
                  &gt;
                    &lt;Text className="text-3xl font-bold text-gray-800"&gt;⚀&lt;/Text&gt;
                  &lt;/View&gt;
                &lt;/View&gt;
              &lt;/View&gt;
            )}
          &lt;/View&gt;
        )}

        {/* 结果展示区域 */}
        {results.length &gt; 0 &amp;&amp; !showCup &amp;&amp; (
          &lt;View className="text-center"&gt;
            &lt;Text className="text-lg font-bold text-primary mb-2"&gt;投掷结果&lt;/Text&gt;
            &lt;Text className="text-3xl font-bold text-on-surface mb-2"&gt;{results.join(' · ')}&lt;/Text&gt;
            {diceCount &gt; 1 &amp;&amp; (
              &lt;Text className="text-sm text-on-surface-variant"&gt;总计: {total}&lt;/Text&gt;
            )}
          &lt;/View&gt;
        )}
      &lt;/View&gt;

      {/* 投掷按钮 */}
      &lt;View className="px-4 pb-8"&gt;
        &lt;Button
          className="w-full py-4 rounded-2xl text-lg font-bold"
          style={{
            boxShadow: '0 10px 25px rgba(245, 158, 11, 0.2)'
          }}
          onClick={handleRoll}
          disabled={rolling}
        &gt;
          {rolling ? (
            &lt;Text className="text-white"&gt;投掷中...&lt;/Text&gt;
          ) : (rollMode === 'shake' ? (
            &lt;View className="flex items-center justify-center gap-2"&gt;
              &lt;Smartphone size={24} color="#fff" /&gt;
              &lt;Text className="text-white"&gt;模拟摇晃&lt;/Text&gt;
            &lt;/View&gt;
          ) : (
            &lt;Text className="text-white"&gt;开始投掷&lt;/Text&gt;
          ))}
        &lt;/Button&gt;
      &lt;/View&gt;

      {/* 设置面板 */}
      {showSettings &amp;&amp; (
        &lt;View className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center"&gt;
          &lt;View className="bg-surface rounded-t-3xl w-full max-h-[80vh] overflow-y-auto"&gt;
            &lt;View className="p-6"&gt;
              {/* 模态框标题 */}
              &lt;View className="flex items-center justify-between mb-6"&gt;
                &lt;Text className="text-xl font-bold text-on-surface"&gt;投掷设置&lt;/Text&gt;
                &lt;View 
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container"
                  onClick={() =&gt; setShowSettings(false)}
                &gt;
                  &lt;X size={20} color="#57534E" /&gt;
                &lt;/View&gt;
              &lt;/View&gt;

              {/* 骰子类型选择 */}
              &lt;View className="mb-6"&gt;
                &lt;Text className="text-sm font-semibold text-on-surface-variant mb-3"&gt;选择骰子类型&lt;/Text&gt;
                &lt;View className="flex gap-2 overflow-x-auto pb-2"&gt;
                  {DICE_TYPES.map((dice) =&gt; (
                    &lt;View
                      key={dice.key}
                      className={`flex-shrink-0 px-4 py-2 rounded-full cursor-pointer transition-all ${
                        selectedDice.key === dice.key 
                          ? 'bg-primary text-white' 
                          : 'bg-surface-container text-on-surface-variant'
                      }`}
                      onClick={() =&gt; setSelectedDice(dice)}
                    &gt;
                      &lt;Text className="text-sm font-medium"&gt;{dice.label}&lt;/Text&gt;
                    &lt;/View&gt;
                  ))}
                &lt;/View&gt;
              &lt;/View&gt;

              {/* 骰子数量选择 */}
              &lt;View className="mb-6"&gt;
                &lt;Text className="text-sm font-semibold text-on-surface-variant mb-3"&gt;
                  选择骰子数量: &lt;Text className="text-primary font-bold"&gt;{diceCount}&lt;/Text&gt;
                &lt;/Text&gt;
                &lt;View className="flex items-center gap-4"&gt;
                  &lt;View
                    className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center cursor-pointer"
                    onClick={() =&gt; setDiceCount(Math.max(1, diceCount - 1))}
                  &gt;
                    &lt;Minus size={20} color="#57534E" /&gt;
                  &lt;/View&gt;
                  &lt;View className="flex-1 h-3 bg-surface-container rounded-full relative"&gt;
                    &lt;View 
                      className="absolute left-0 top-0 h-full bg-primary rounded-full" 
                      style={{ width: `${(diceCount / 10) * 100}%` }}
                    /&gt;
                  &lt;/View&gt;
                  &lt;View
                    className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center cursor-pointer"
                    onClick={() =&gt; setDiceCount(Math.min(10, diceCount + 1))}
                  &gt;
                    &lt;Plus size={20} color="#57534E" /&gt;
                  &lt;/View&gt;
                &lt;/View&gt;
              &lt;/View&gt;

              {/* 投掷方式选择 */}
              &lt;View className="mb-6"&gt;
                &lt;Text className="text-sm font-semibold text-on-surface-variant mb-3"&gt;投掷方式&lt;/Text&gt;
                &lt;View className="space-y-3"&gt;
                  &lt;View 
                    className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer ${
                      rollMode === 'tap' ? 'bg-primary-container' : 'bg-surface-container'
                    }`}
                    onClick={() =&gt; setRollMode('tap')}
                  &gt;
                    &lt;View
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        rollMode === 'tap' ? 'border-primary' : 'border-outline'
                      }`}
                    &gt;
                      {rollMode === 'tap' &amp;&amp; &lt;View className="w-3 h-3 rounded-full bg-primary" /&gt;}
                    &lt;/View&gt;
                    &lt;View className="flex-1"&gt;
                      &lt;Text className="font-medium text-on-surface"&gt;点击投掷&lt;/Text&gt;
                      &lt;Text className="text-sm text-on-surface-variant"&gt;点击按钮即可投掷骰子&lt;/Text&gt;
                    &lt;/View&gt;
                    &lt;MousePointerClick size={20} color="#57534E" /&gt;
                  &lt;/View&gt;
                  
                  &lt;View 
                    className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer ${
                      rollMode === 'shake' ? 'bg-primary-container' : 'bg-surface-container'
                    }`}
                    onClick={() =&gt; setRollMode('shake')}
                  &gt;
                    &lt;View
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        rollMode === 'shake' ? 'border-primary' : 'border-outline'
                      }`}
                    &gt;
                      {rollMode === 'shake' &amp;&amp; &lt;View className="w-3 h-3 rounded-full bg-primary" /&gt;}
                    &lt;/View&gt;
                    &lt;View className="flex-1"&gt;
                      &lt;Text className="font-medium text-on-surface"&gt;摇一摇投掷&lt;/Text&gt;
                      &lt;Text className="text-sm text-on-surface-variant"&gt;摇动设备触发投掷，配合杯子动画&lt;/Text&gt;
                    &lt;/View&gt;
                    &lt;Smartphone size={20} color="#57534E" /&gt;
                  &lt;/View&gt;
                &lt;/View&gt;
              &lt;/View&gt;

              {/* 音效设置 */}
              &lt;View className="mb-6"&gt;
                &lt;Text className="text-sm font-semibold text-on-surface-variant mb-3"&gt;音效设置&lt;/Text&gt;
                &lt;View className="flex items-center justify-between p-4 bg-surface-container rounded-xl"&gt;
                  &lt;View&gt;
                    &lt;Text className="font-medium text-on-surface"&gt;开启音效&lt;/Text&gt;
                    &lt;Text className="text-sm text-on-surface-variant"&gt;摇晃、停止、掀开音效&lt;/Text&gt;
                  &lt;/View&gt;
                  &lt;View
                    className={`w-12 h-7 rounded-full relative cursor-pointer ${soundEnabled ? 'bg-primary' : 'bg-surface-container-highest'}`}
                    onClick={() =&gt; setSoundEnabled(!soundEnabled)}
                  &gt;
                    &lt;View 
                      className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow ${
                        soundEnabled ? 'right-1' : 'left-1'
                      }`}
                    /&gt;
                  &lt;/View&gt;
                &lt;/View&gt;
              &lt;/View&gt;

              {/* 保存按钮 */}
              &lt;Button
                className="w-full py-4 rounded-xl text-base font-semibold"
                onClick={saveSettings}
              &gt;
                &lt;Text className="text-white"&gt;保存设置&lt;/Text&gt;
              &lt;/Button&gt;
            &lt;/View&gt;
          &lt;/View&gt;
        &lt;/View&gt;
      )}
    &lt;/View&gt;
  )
}

export default DicePage
