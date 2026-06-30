import { View, Text } from '@tarojs/components'
import Taro, { useShareAppMessage } from '@tarojs/taro'
import { Dices, Timer, Layers, Shuffle, Calculator, Hand } from 'lucide-react-taro'
import { WheelIcon } from '@/components/wheel-icon'
import type { FC, ReactNode } from 'react'

interface ToolItem {
  key: string
  name: string
  desc: string
  icon: ReactNode
  iconBg: string
  iconColor: string
  path: string
  soon: boolean
}

interface ToolGroup {
  label: string
  emoji: string
  tools: ToolItem[]
}

const TOOL_GROUPS: ToolGroup[] = [
  {
    label: '随机类',
    emoji: '🎲',
    tools: [
      {
        key: 'dice',
        name: '骰子',
        desc: 'D4-D20多种骰子',
        icon: <Dices size={20} color="#6366f1" />,
        iconBg: '#ede9fe',
        iconColor: '#6366f1',
        path: '/pages/dice/index',
        soon: false,
      },
      {
        key: 'random',
        name: '随机选人',
        desc: '从名单中随机选择',
        icon: <Shuffle size={20} color="#ec4899" />,
        iconBg: '#fce7f3',
        iconColor: '#ec4899',
        path: '/pages/random/index',
        soon: false,
      },
      {
        key: 'wheel',
        name: '转盘',
        desc: '自定义转盘抽奖',
        icon: <WheelIcon size={20} color="#f59e0b" />,
        iconBg: '#fef3c7',
        iconColor: '#f59e0b',
        path: '/pages/wheel-manage/index',
        soon: false,
      },
      {
        key: 'finger-picker',
        name: '手指选人',
        desc: '多人触屏随机选人',
        icon: <Hand size={20} color="#ef4444" />,
        iconBg: '#fee2e2',
        iconColor: '#ef4444',
        path: '/pages/finger-picker/index',
        soon: false,
      },

    ],
  },
  {
    label: '计时类',
    emoji: '⏱️',
    tools: [
      {
        key: 'timer',
        name: '计时器',
        desc: '倒计时/正计时',
        icon: <Timer size={20} color="#10b981" />,
        iconBg: '#d1fae5',
        iconColor: '#10b981',
        path: '/pages/timer/index',
        soon: false,
      },
    ],
  },
  {
    label: '牌·分类',
    emoji: '🃏',
    tools: [
      {
        key: 'cards',
        name: '抽牌',
        desc: '标准扑克/自定义牌组',
        icon: <Layers size={20} color="#6366f1" />,
        iconBg: '#ede9fe',
        iconColor: '#6366f1',
        path: '/pages/cards/index',
        soon: false,
      },
      {
        key: 'scorer',
        name: '计分器',
        desc: '通用/定制计分',
        icon: <Calculator size={20} color="#8b5cf6" />,
        iconBg: '#ede9fe',
        iconColor: '#8b5cf6',
        path: '/pages/scorer/index',
        soon: false,
      },
    ],
  },
]

const ToolsPage: FC = () => {
  useShareAppMessage(() => ({ title: '数智局伴-工具箱-骰子计时计分全能工具', path: '/pages/tools/index' }))
  const handleToolClick = (tool: ToolItem) => {
    if (tool.soon) {
      Taro.showToast({ title: '功能开发中', icon: 'none' })
      return
    }
    Taro.navigateTo({ url: tool.path })
  }

  return (
    <View className="flex flex-col min-h-screen bg-background">
      {/* 分组工具列表 */}
      <View className="px-4 pt-4 pb-24 flex flex-col gap-4">
        {TOOL_GROUPS.map((group) => (
          <View key={group.label}>
            {/* 分组标题 */}
            <View className="flex flex-row items-center gap-2 mb-3 px-1">
              <Text className="text-base">{group.emoji}</Text>
              <Text className="text-sm font-semibold text-gray-500">{group.label}</Text>
              <View className="flex-1 h-px bg-gray-200 ml-1" />
            </View>

            {/* 工具卡片行 */}
            <View className="flex flex-col gap-2">
              {group.tools.map((tool) => (
                <View
                  key={tool.key}
                  className="flex flex-row items-center bg-white rounded-2xl px-4 py-3"
                  style={{ opacity: tool.soon ? 0.5 : 1 }}
                  onClick={() => handleToolClick(tool)}
                >
                  <View
                    className="w-9 h-9 rounded-xl flex items-center justify-center mr-3 flex-shrink-0"
                    style={{ backgroundColor: tool.iconBg }}
                  >
                    {tool.icon}
                  </View>
                  <View className="flex flex-col flex-1">
                    <Text className="text-sm font-semibold text-gray-800">{tool.name}</Text>
                    <Text className="text-xs text-gray-400 mt-1">{tool.desc}</Text>
                  </View>
                  {tool.soon ? (
                    <View className="rounded-full px-2 py-1 bg-gray-100">
                      <Text className="text-xs text-gray-400">即将上线</Text>
                    </View>
                  ) : (
                    <Text className="text-gray-300 text-base">›</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

export default ToolsPage
