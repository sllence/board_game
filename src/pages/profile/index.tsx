import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, History, Clock, Heart, Settings, LogIn, Gamepad2 } from 'lucide-react-taro'
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
    if (!seconds) return '0小时'
    const h = Math.floor(seconds / 3600)
    return `${h}小时`
  }

  return (
    <View className="flex flex-col min-h-screen bg-background">
      {/* 用户信息区 */}
      <View className="px-4 pt-14 pb-6 bg-muted bg-opacity-30">
        {userInfo ? (
          <View className="flex flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-full bg-primary bg-opacity-10 flex items-center justify-center">
              <User size={32} color="#1a1a2e" />
            </View>
            <View className="flex-1">
              <Text className="block text-lg font-bold text-foreground">{userInfo.nickname}</Text>
              <Text className="block text-sm text-muted-foreground mt-1">ID: {userInfo.id}</Text>
            </View>
          </View>
        ) : (
          <View className="flex flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <User size={32} color="#9ca3af" />
            </View>
            <View className="flex-1">
              <Text className="block text-lg font-bold text-foreground">未登录</Text>
              <Text className="block text-sm text-muted-foreground mt-1">登录后同步对局记录</Text>
            </View>
            <Button size="sm" onClick={login}>
              <View className="flex flex-row items-center gap-1">
                <LogIn size={14} color="#fff" />
                <Text className="text-white">登录</Text>
              </View>
            </Button>
          </View>
        )}
      </View>

      {/* 统计数据 */}
      {userInfo && (
        <View className="px-4 -mt-3 mb-4">
          <Card>
            <CardContent className="flex flex-row justify-around p-4">
              <View className="flex flex-col items-center">
                <Gamepad2 size={20} color="#6366f1" />
                <Text className="block text-lg font-bold text-foreground mt-1">{userInfo.total_games || 0}</Text>
                <Text className="block text-xs text-muted-foreground">对局数</Text>
              </View>
              <View className="flex flex-col items-center">
                <History size={20} color="#1a1a2e" />
                <Text className="block text-lg font-bold text-foreground mt-1">{userInfo.total_wins || 0}</Text>
                <Text className="block text-xs text-muted-foreground">胜场</Text>
              </View>
              <View className="flex flex-col items-center">
                <Clock size={20} color="#10b981" />
                <Text className="block text-lg font-bold text-foreground mt-1">{formatTime(userInfo.total_time)}</Text>
                <Text className="block text-xs text-muted-foreground">游戏时长</Text>
              </View>
            </CardContent>
          </Card>
        </View>
      )}

      {/* 功能列表 */}
      <View className="px-4 pb-20">
        <View className="flex flex-col gap-2">
          <Card className="cursor-pointer" onClick={() => Taro.showToast({ title: '功能开发中', icon: 'none' })}>
            <CardContent className="flex flex-row items-center p-4 gap-3">
              <Heart size={20} color="#ef4444" />
              <View className="flex-1">
                <Text className="block text-sm font-medium text-foreground">我的收藏</Text>
                <Text className="block text-xs text-muted-foreground">收藏的桌游和攻略</Text>
              </View>
            </CardContent>
          </Card>

          <Card className="cursor-pointer" onClick={() => Taro.showToast({ title: '功能开发中', icon: 'none' })}>
            <CardContent className="flex flex-row items-center p-4 gap-3">
              <Settings size={20} color="#6b7280" />
              <View className="flex-1">
                <Text className="block text-sm font-medium text-foreground">设置</Text>
                <Text className="block text-xs text-muted-foreground">主题、通知等偏好设置</Text>
              </View>
            </CardContent>
          </Card>
        </View>
      </View>
    </View>
  )
}

export default ProfilePage
