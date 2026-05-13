import { View, Text, Image, Input, Button as TaroButton } from '@tarojs/components' // eslint-disable-line no-restricted-syntax -- 微信小程序 chooseAvatar/openType 需要原生Button和Input
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronRight, LogOut } from 'lucide-react-taro'
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
  const [tempNickname, setTempNickname] = useState('')

  const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP

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

  /** 微信小程序登录 - 仅用 Taro.login 获取 code，不调用已废弃的 getUserProfile */
  const weappLogin = async (nickname?: string, avatarUrl?: string) => {
    const loginRes = await Taro.login()
    console.log('[ProfilePage] Taro.login code:', loginRes.code)

    const res = await Network.request({
      url: '/api/auth/login',
      method: 'POST',
      data: {
        code: loginRes.code,
        platform: 'weapp',
        nickname: nickname || '微信用户',
        avatar_url: avatarUrl || '',
      },
    })
    console.log('[ProfilePage] login response:', res.data)
    return res.data?.data
  }

  /** 抖音小程序登录 */
  const ttLogin = async () => {
    const loginRes = await Taro.login()
    console.log('[ProfilePage] TT login code:', loginRes.code)

    const res = await Network.request({
      url: '/api/auth/login',
      method: 'POST',
      data: {
        code: loginRes.code,
        platform: 'tt',
      },
    })
    console.log('[ProfilePage] login response:', res.data)
    return res.data?.data
  }

  /** H5 开发环境登录 */
  const h5Login = async () => {
    const res = await Network.request({
      url: '/api/auth/login',
      method: 'POST',
      data: {
        code: 'dev_code',
        platform: 'h5',
      },
    })
    console.log('[ProfilePage] login response:', res.data)
    return res.data?.data
  }

  /** 微信小程序：选择头像回调 */
  const onChooseAvatar = (e) => {
    const avatarUrl = e.detail.avatarUrl
    console.log('[ProfilePage] chooseAvatar:', avatarUrl)
    // 先登录获取用户信息，再更新头像
    doLogin(avatarUrl)
  }

  /** 执行登录（可选传入头像URL） */
  const doLogin = async (avatarUrl?: string) => {
    if (isLoggingIn) return
    setIsLoggingIn(true)
    try {
      let user: UserInfo | undefined
      if (isWeapp) {
        user = await weappLogin(tempNickname, avatarUrl)
      } else if (Taro.getEnv() === Taro.ENV_TYPE.TT) {
        user = await ttLogin()
      } else {
        user = await h5Login()
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

  /** H5/抖音端简单登录（无需头像选择） */
  const simpleLogin = async () => {
    if (isLoggingIn) return
    setIsLoggingIn(true)
    try {
      let user: UserInfo | undefined
      if (Taro.getEnv() === Taro.ENV_TYPE.TT) {
        user = await ttLogin()
      } else {
        user = await h5Login()
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

  const formatTime = (seconds: number) => {
    if (!seconds) return '0'
    const h = Math.floor(seconds / 3600)
    return `${h}`
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
              className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <Text className="text-2xl">🎮</Text>
            </View>
            <Text className="block text-lg font-bold text-white mb-1">未登录</Text>
            <Text className="block text-sm text-white mb-4" style={{ opacity: 0.7 }}>登录后同步对局记录</Text>

            {/* 微信小程序：使用 open-type 选择头像 */}
            {isWeapp ? (
              <View className="flex flex-col items-center gap-3 w-full">
                {/* 昵称输入 */}
                <View
                  className="w-full rounded-xl px-4 py-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                >
                  <Input
                    style={{ width: '100%', fontSize: '14px', color: '#fff' }}
                    placeholder="输入昵称（选填）"
                    placeholderStyle="color: rgba(255,255,255,0.5)"
                    value={tempNickname}
                    onInput={(e) => setTempNickname(e.detail.value)}
                  />
                </View>
                {/* 选择头像并登录按钮 */}
                <TaroButton
                  openType="chooseAvatar"
                  onChooseAvatar={onChooseAvatar}
                  className="w-full border-0 rounded-xl py-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.25)', fontSize: '14px' }}
                >
                  <Text className="text-white text-sm">😊 选择头像并登录</Text>
                </TaroButton>
                {/* 快捷登录（不选头像） */}
                <Button
                  onClick={() => doLogin()}
                  className="w-full border-0 rounded-xl py-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  disabled={isLoggingIn}
                >
                  <Text className="text-white text-sm" style={{ opacity: 0.8 }}>
                    {isLoggingIn ? '登录中...' : '跳过，直接登录'}
                  </Text>
                </Button>
              </View>
            ) : (
              /* H5/抖音：简单登录 */
              <Button
                onClick={simpleLogin}
                disabled={isLoggingIn}
                className="border-0 rounded-xl px-8 py-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
              >
                <Text className="text-white text-sm">
                  {isLoggingIn ? '登录中...' : '一键登录'}
                </Text>
              </Button>
            )}
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
                  <Text className="text-base">{item.emoji}</Text>
                </View>
                <View className="flex-1">
                  <Text className="block text-sm font-medium text-[#1e1b4b]">{item.name}</Text>
                  <Text className="block text-xs text-gray-400">{item.desc}</Text>
                </View>
                {item.soon && (
                  <View className="mr-2 px-2 py-1 rounded" style={{ backgroundColor: 'rgba(99,102,241,0.1)' }}>
                    <Text className="text-xs text-indigo-600">即将上线</Text>
                  </View>
                )}
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
