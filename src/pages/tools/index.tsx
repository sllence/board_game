import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Dices, Timer, Layers, Shuffle, Calculator, Target } from 'lucide-react-taro'
import type { FC, ReactNode } from 'react'

interface ToolItem {
  key: string
  name: string
  desc: string
  icon: ReactNode
  gradient: string
  path: string
  soon: boolean
}

const TOOLS: ToolItem[] = [
  {
    key: 'dice',
    name: '骰子',
    desc: 'D4-D20多种骰子',
    icon: <Dices size={28} color="#fff" />,
    gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    path: '/pages/dice/index',
    soon: false,
  },
  {
    key: 'timer',
    name: '计时器',
    desc: '倒计时/正计时',
    icon: <Timer size={28} color="#fff" />,
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    path: '/pages/timer/index',
    soon: false,
  },
  {
    key: 'cards',
    name: '抽牌',
    desc: '标准扑克/自定义牌组',
    icon: <Layers size={28} color="#fff" />,
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    path: '/pages/cards/index',
    soon: false,
  },
  {
    key: 'random',
    name: '随机选人',
    desc: '从名单中随机选择',
    icon: <Shuffle size={28} color="#fff" />,
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    path: '/pages/random/index',
    soon: false,
  },
  {
    key: 'scorer',
    name: '计分器',
    desc: '通用/定制计分',
    icon: <Calculator size={28} color="#fff" />,
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    path: '/pages/scorer/index',
    soon: false,
  },
  {
    key: 'wheel',
    name: '转盘',
    desc: '自定义转盘抽奖',
    icon: <Target size={28} color="#fff" />,
    gradient: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
    path: '',
    soon: true,
  },
]

const ToolsPage: FC = () => {
  const handleToolClick = (tool: ToolItem) => {
    if (tool.soon) {
      Taro.showToast({ title: '功能开发中', icon: 'none' })
      return
    }
    Taro.navigateTo({ url: tool.path })
  }

  return (
    <View className="flex flex-col min-h-screen bg-[#f5f5f7]">
      {/* 顶部标题区 */}
      <View className="px-5 pt-12 pb-6" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
        <View className="flex flex-row items-center gap-2 mb-1">
          <Text style={{ fontSize: '18px' }}>🧰</Text>
          <Text className="text-sm font-medium text-yellow-300">工具箱</Text>
        </View>
        <Text className="block text-xl font-bold text-white">桌游辅助工具</Text>
        <Text className="block text-sm text-white text-opacity-80 mt-1">让对局更顺畅</Text>
      </View>

      {/* 工具网格 - Bento Grid */}
      <View className="px-4 -mt-4 pb-20">
        <View className="flex flex-row flex-wrap gap-3">
          {TOOLS.map((tool) => (
            <View
              key={tool.key}
              className="cursor-pointer rounded-2xl overflow-hidden shadow-sm"
              style={{ width: 'calc(50% - 6px)', background: tool.gradient }}
              onClick={() => handleToolClick(tool)}
            >
              <View className="p-4 flex flex-col items-center">
                <View
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                >
                  {tool.icon}
                </View>
                <Text className="block text-base font-bold text-white">{tool.name}</Text>
                <Text className="block text-xs text-white text-opacity-80 mt-1 text-center">{tool.desc}</Text>
                {tool.soon && (
                  <View className="mt-2 rounded-full px-2 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                    <Text className="text-xs text-white">即将上线</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

export default ToolsPage
