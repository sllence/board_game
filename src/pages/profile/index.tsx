import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { FC } from 'react'

interface UserInfo {
  id: number
  nickname: string
  avatar_url: string
  total_games: number
  total_wins: number
  total_time: number
}

const ProfilePage: FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)

  useEffect(() => {
    const cached = Taro.getStorageSync('userInfo')
    if (cached) {
      try {
        setUserInfo(JSON.parse(cached))
      } catch {
        // ignore parse error
      }
    }
  }, [])

  const MENU_ITEMS = [
    { emoji: '❤️', name: '我的收藏', desc: '收藏的桌游和攻略', soon: true },
    { emoji: '⚙️', name: '设置', desc: '主题、通知等偏好', soon: true },
  ]

  return (
    <View className="flex flex-col min-h-screen bg-[#f5f5f7]">
      {/* 用户信息区 - 渐变头部 */}
      <View className="px-5 pt-14 pb-8" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
        <View className="flex flex-row items-center gap-4">
          <View className="flex items-center justify-center" style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.2)' }}>
            {userInfo?.avatar_url ? (
              <Image src={userInfo.avatar_url} style={{ width: '64px', height: '64px', borderRadius: '50%' }} />
            ) : (
              <Text className="text-2xl">🎮</Text>
            )}
          </View>
          <View className="flex-1">
            <Text className="block text-lg font-bold text-white">{userInfo?.nickname || '桌游玩家'}</Text>
          </View>
          <Button
            size="sm"
            onClick={() => {
              setUserInfo(null)
              Taro.removeStorageSync('userInfo')
              Taro.showToast({ title: '已退出', icon: 'success' })
            }}
            className="border-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            <Text className="text-white text-xs">退出</Text>
          </Button>
        </View>
      </View>

      {/* 统计卡片 */}
      <View className="px-4 -mt-4 mb-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-row justify-around p-5">
            <View className="flex flex-col items-center">
              <View
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                <Text className="text-base">🎲</Text>
              </View>
              <Text className="block text-lg font-bold text-[#1e1b4b]">{userInfo?.total_games || 0}</Text>
              <Text className="block text-xs text-gray-400">对局数</Text>
            </View>
            <View className="flex flex-col items-center">
              <View
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              >
                <Text className="text-base">🏆</Text>
              </View>
              <Text className="block text-lg font-bold text-[#1e1b4b]">{userInfo?.total_wins || 0}</Text>
              <Text className="block text-xs text-gray-400">胜场</Text>
            </View>
            <View className="flex flex-col items-center">
              <View
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                <Text className="text-base">⏱️</Text>
              </View>
              <Text className="block text-lg font-bold text-[#1e1b4b]">{userInfo?.total_time ? Math.floor(userInfo.total_time / 3600) : 0}</Text>
              <Text className="block text-xs text-gray-400">游戏时长(h)</Text>
            </View>
          </CardContent>
        </Card>
      </View>

      {/* 菜单列表 */}
      <View className="px-4">
        {MENU_ITEMS.map((item) => (
          <Card key={item.name} className="border-0 shadow-sm mb-3">
            <CardContent className="flex flex-row items-center p-4">
              <Text className="text-xl mr-3">{item.emoji}</Text>
              <View className="flex-1">
                <Text className="block text-sm font-medium text-gray-800">{item.name}</Text>
                <Text className="block text-xs text-gray-400 mb-1">{item.desc}</Text>
              </View>
              {item.soon && (
                <View
                  className="rounded-full px-2 py-1"
                  style={{ backgroundColor: 'rgba(99,102,241,0.1)' }}
                >
                  <Text className="text-xs text-indigo-500">即将上线</Text>
                </View>
              )}
            </CardContent>
          </Card>
        ))}
      </View>

      {/* 版本信息 */}
      <View className="flex-1" />
      <View className="flex items-center pb-8 pt-4">
        <Text className="block text-xs text-gray-300">桌游助手 v1.0.0</Text>
      </View>
    </View>
  )
}

export default ProfilePage
