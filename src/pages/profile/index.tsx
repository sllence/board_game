import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, History, Clock, Heart, Settings, LogIn, Gamepad2, ChevronRight } from 'lucide-react-taro'
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

  const login = async () => {
    try {
      const env = Taro.getEnv()
      const isMiniApp = env === Taro.ENV_TYPE.WEAPP || env === Taro.ENV_TYPE.TT
      const platform = isMiniApp
        ? (env === Taro.ENV_TYPE.TT ? 'tt' : 'weapp')
        : 'weapp'
      let code = 'dev_code'

      if (env === Taro.ENV_TYPE.WEAPP) {
        const loginRes = await Taro.login()
        code = loginRes.code
      }

      const res = await Network.request({
        url: '/api/auth/login',
        method: 'POST',
        data: { code, platform },
      })
      console.log('[ProfilePage] login response:', res.data)
      const user = res.data?.data
      if (user) {
        setUserInfo(user)
        Taro.setStorageSync('userInfo', JSON.stringify(user))
      }
    } catch (err) {
      console.error('[ProfilePage] login error:', err)
      Taro.showToast({ title: '登录失败', icon: 'none' })
    }
  }

  const formatTime = (seconds: number) => {
    if (!seconds) return '0'
    const h = Math.floor(seconds / 3600)
    return `${h}`
  }

  const MENU_ITEMS = [
    { icon: <Heart size={18} color="#ef4444" />, name: '我的收藏', desc: '收藏的桌游和攻略', soon: true },
    { icon: <Settings size={18} color="#6b7280" />, name: '设置', desc: '主题、通知等偏好', soon: true },
  ]

  return (
    <View className="flex flex-col min-h-screen bg-[#f5f5f7]">
      {/* 用户信息区 - 渐变头部 */}
      <View className="px-5 pt-14 pb-8" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
        {userInfo ? (
          <View className="flex flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
              <User size={28} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="block text-lg font-bold text-white">{userInfo.nickname}</Text>
              <Text className="block text-sm text-white text-opacity-70 mt-1">ID: {userInfo.id}</Text>
            </View>
          </View>
        ) : (
          <View className="flex flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
              <User size={28} color="rgba(255,255,255,0.6)" />
            </View>
            <View className="flex-1">
              <Text className="block text-lg font-bold text-white">未登录</Text>
              <Text className="block text-sm text-white text-opacity-70 mt-1">登录后同步对局记录</Text>
            </View>
            <Button size="sm" onClick={login} className="bg-white bg-opacity-20 border-0">
              <View className="flex flex-row items-center gap-1">
                <LogIn size={14} color="#fff" />
                <Text className="text-white">登录</Text>
              </View>
            </Button>
          </View>
        )}
      </View>

      {/* 统计卡片 */}
      {userInfo && (
        <View className="px-4 -mt-4 mb-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-row justify-around p-5">
              <View className="flex flex-col items-center">
                <View className="w-10 h-10 rounded-xl flex items-center justify-center mb-1" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  <Gamepad2 size={18} color="#fff" />
                </View>
                <Text className="block text-lg font-bold text-[#1e1b4b]">{userInfo.total_games || 0}</Text>
                <Text className="block text-xs text-gray-400">对局数</Text>
              </View>
              <View className="flex flex-col items-center">
                <View className="w-10 h-10 rounded-xl flex items-center justify-center mb-1" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                  <History size={18} color="#fff" />
                </View>
                <Text className="block text-lg font-bold text-[#1e1b4b]">{userInfo.total_wins || 0}</Text>
                <Text className="block text-xs text-gray-400">胜场</Text>
              </View>
              <View className="flex flex-col items-center">
                <View className="w-10 h-10 rounded-xl flex items-center justify-center mb-1" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  <Clock size={18} color="#fff" />
                </View>
                <Text className="block text-lg font-bold text-[#1e1b4b]">{formatTime(userInfo.total_time)}</Text>
                <Text className="block text-xs text-gray-400">小时</Text>
              </View>
            </CardContent>
          </Card>
        </View>
      )}

      {/* 功能列表 */}
      <View className="px-4 pb-20">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {MENU_ITEMS.map((item, idx) => (
              <View
                key={idx}
                className="flex flex-row items-center px-4 py-4 cursor-pointer"
                style={{ borderBottomWidth: idx < MENU_ITEMS.length - 1 ? 1 : 0, borderBottomColor: '#f3f4f6' }}
                onClick={() => Taro.showToast({ title: '功能开发中', icon: 'none' })}
              >
                <View className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
                  {item.icon}
                </View>
                <View className="flex-1">
                  <Text className="block text-sm font-medium text-[#1e1b4b]">{item.name}</Text>
                  <Text className="block text-xs text-gray-400">{item.desc}</Text>
                </View>
                <ChevronRight size={16} color="#d1d5db" />
              </View>
            ))}
          </CardContent>
        </Card>
      </View>
    </View>
  )
}

export default ProfilePage
