import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Card, CardContent } from '@/components/ui/card'
import { Dices, Timer, Layers, Shuffle, Calculator, Target } from 'lucide-react-taro'
import type { FC } from 'react'

interface ToolItem {
  key: string
  name: string
  desc: string
  icon: React.ReactNode
  color: string
  bgColor: string
  path: string
}

const TOOLS: ToolItem[] = [
  {
    key: 'dice',
    name: '骰子',
    desc: 'D4-D20多种骰子',
    icon: <Dices size={24} color="#6366f1" />,
    color: '#6366f1',
    bgColor: '#eef2ff',
    path: '/pages/dice/index',
  },
  {
    key: 'timer',
    name: '计时器',
    desc: '倒计时/正计时',
    icon: <Timer size={24} color="#10b981" />,
    color: '#10b981',
    bgColor: '#ecfdf5',
    path: '/pages/timer/index',
  },
  {
    key: 'cards',
    name: '抽牌',
    desc: '标准扑克/自定义牌组',
    icon: <Layers size={24} color="#f59e0b" />,
    color: '#f59e0b',
    bgColor: '#fffbeb',
    path: '/pages/cards/index',
  },
  {
    key: 'random',
    name: '随机选人',
    desc: '从名单中随机选择',
    icon: <Shuffle size={24} color="#ef4444" />,
    color: '#ef4444',
    bgColor: '#fef2f2',
    path: '/pages/random/index',
  },
  {
    key: 'scorer',
    name: '计分器',
    desc: '通用/定制计分',
    icon: <Calculator size={24} color="#8b5cf6" />,
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
    path: '/pages/scorer/index',
  },
  {
    key: 'wheel',
    name: '转盘',
    desc: '自定义转盘抽奖',
    icon: <Target size={24} color="#9ca3af" />,
    color: '#9ca3af',
    bgColor: '#f3f4f6',
    path: '',
  },
]

const ToolsPage: FC = () => {
  const handleToolClick = (tool: ToolItem) => {
    if (!tool.path) {
      Taro.showToast({ title: '功能开发中', icon: 'none' })
      return
    }
    Taro.navigateTo({ url: tool.path })
  }

  return (
    <View className="flex flex-col min-h-screen bg-background">
      {/* 标题 */}
      <View className="px-4 pt-12 pb-4">
        <Text className="block text-xl font-bold text-foreground">工具箱</Text>
        <Text className="block text-sm text-muted-foreground mt-1">桌游辅助工具，让对局更顺畅</Text>
      </View>

      {/* 工具网格 */}
      <View className="px-4 pb-20">
        <View className="grid grid-cols-2 gap-3">
          {TOOLS.map((tool) => (
            <Card key={tool.key} className="cursor-pointer" onClick={() => handleToolClick(tool)}>
              <CardContent className="flex flex-col items-center p-5">
                <View
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: tool.bgColor }}
                >
                  {tool.icon}
                </View>
                <Text className="block text-sm font-semibold text-foreground">{tool.name}</Text>
                <Text className="block text-xs text-muted-foreground mt-1">{tool.desc}</Text>
              </CardContent>
            </Card>
          ))}
        </View>
      </View>
    </View>
  )
}

export default ToolsPage
