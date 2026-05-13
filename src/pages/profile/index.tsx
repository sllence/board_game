import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react-taro'
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
  const [isLoggingIn, setIsLoggingIn] = useState(false)

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

  /** 一键登录 */
  const handleLogin = async () => {
    if (isLoggingIn) return
    setIsLoggingIn(true)
    try {
      let user: UserInfo | undefined
      const env = Taro.getEnv()

      if (env === Taro.ENV_TYPE.WEAPP || env === Taro.ENV_TYPE.TT) {
        // 微信/抖音小程序：Taro.login 获取 code（静默调用，不会弹窗）
        const platformName = env === Taro.ENV_TYPE.WEAPP ? '微信' : '抖音'
        Taro.showLoading({ title: `${platformName}登录中...` })
        const loginRes = await Taro.login()
        console.log('[ProfilePage] Taro.login code:', loginRes.code)

        const res = await Network.request({
          url: '/api/auth/login',
          method: 'POST',
          data: {
            code: loginRes.code,
            platform: env === Taro.ENV_TYPE.WEAPP ? 'weapp' : 'tt',
            nickname: env === Taro.ENV_TYPE.WEAPP ? '微信用户' : '抖音用户',
          },
        })
        Taro.hideLoading()
        console.log('[ProfilePage] login response:', res.data)
        user = res.data?.data
      } else {
        // H5 开发环境
        const res = await Network.request({
          url: '/api/auth/login',
          method: 'POST',
          data: { code: 'dev_code', platform: 'h5' },
        })
        console.log('[ProfilePage] login response:', res.data)
        user = res.data?.data
      }

      if (user) {
        setUserInfo(user)
        Taro.setStorageSync('userInfo', JSON.stringify(user))
        Taro.showToast({ title: '登录成功', icon: 'success' })
      } else {
        Taro.showToast({ title: '登录失败', icon: 'none' })
      }
    } catch (err) {
      console.error('[ProfilePage] login error:', err)
      Taro.showToast({ title: '登录失败，请重试', icon: 'none' })
    } finally {
      setIsLoggingIn(false)
    }
  }

  /** 退出登录 */
  const logout = () => {
    Taro.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          setUserInfo(null)
          Taro.removeStorageSync('userInfo')
          Taro.showToast({ title: '已退出', icon: 'success' })
        }
      },
    })
  }

  const MENU_ITEMS = [
    { emoji: '❤️', name: '我的收藏', desc: '收藏的桌游和攻略', soon: true },
    { emoji: '⚙️', name: '设置', desc: '主题、通知等偏好', soon: true },
  ]

  return (
    <View className="flex flex-col min-h-screen bg-[#f5f5f7]">
      {/* 用户信息区 - 渐变头部 */}
      <View className="px-5 pt-14 pb-8" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
        {userInfo ? (
          <View className="flex flex-row items-center gap-4">
            {/* 头像 */}
            {userInfo.avatar_url ? (
              <Image
                src={userInfo.avatar_url}
                className="w-16 h-16 rounded-full"
                style={{ width: '64px', height: '64px', borderRadius: '50%' }}
              />
            ) : (
              <View
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <Text className="text-2xl">🎮</Text>
              </View>
            )}
            <View className="flex-1">
              <Text className="block text-lg font-bold text-white">{userInfo.nickname || '桌游玩家'}</Text>
            </View>
            <Button
              size="sm"
              onClick={logout}
              className="border-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
            >
              <View className="flex flex-row items-center gap-1">
                <LogOut size={14} color="#fff" />
                <Text className="text-white text-xs">退出</Text>
              </View>
            </Button>
          </View>
        ) : (
          <View className="flex flex-col items-center">
            <View
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <Text className="text-3xl">🎮</Text>
            </View>
            <Text className="block text-xl font-bold text-white mb-1">桌游助手</Text>
            <Text className="block text-sm text-white mb-6" style={{ opacity: 0.7 }}>登录后同步对局记录</Text>
            <Button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="border-0 rounded-full px-10 py-3"
              style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
            >
              <Text className="text-white text-base font-medium">
                {isLoggingIn ? '登录中...' : '一键登录'}
              </Text>
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
                <View
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                  <Text className="text-base">🎲</Text>
                </View>
                <Text className="block text-lg font-bold text-[#1e1b4b]">{userInfo.total_games || 0}</Text>
                <Text className="block text-xs text-gray-400">对局数</Text>
              </View>
              <View className="flex flex-col items-center">
                <View
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                >
                  <Text className="text-base">🏆</Text>
                </View>
                <Text className="block text-lg font-bold text-[#1e1b4b]">{userInfo.total_wins || 0}</Text>
                <Text className="block text-xs text-gray-400">胜场</Text>
              </View>
              <View className="flex flex-col items-center">
                <View
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  <Text className="text-base">⏱️</Text>
                </View>
                <Text className="block text-lg font-bold text-[#1e1b4b]">{userInfo.total_time ? Math.floor(userInfo.total_time / 3600) : 0}</Text>
                <Text className="block text-xs text-gray-400">游戏时长(h)</Text>
              </View>
            </CardContent>
          </Card>
        </View>
      )}

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
