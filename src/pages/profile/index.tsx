// eslint-disable-next-line no-restricted-syntax -- 微信chooseAvatar和nickname必须使用原生Button/Input
import { View, Text, Image, Button as TaroButton, Input as TaroInput } from '@tarojs/components'
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
  const [tempAvatarUrl, setTempAvatarUrl] = useState('')
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

  /** 保存用户信息到本地和state */
  const saveUser = (user: UserInfo) => {
    setUserInfo(user)
    Taro.setStorageSync('userInfo', JSON.stringify(user))
  }

  /** 微信端：选择头像后回调 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChooseAvatar = (e: any) => {
    const avatarUrl = e?.detail?.avatarUrl
    if (avatarUrl) {
      console.log('[Profile] chooseAvatar url:', avatarUrl)
      setTempAvatarUrl(avatarUrl)
    }
  }

  /** 微信端：输入昵称回调 */
  const handleNicknameInput = (e) => {
    setTempNickname(e.detail.value)
  }

  /** 微信端：确认登录（有头像和昵称） */
  const handleWeappConfirmLogin = async () => {
    if (isLoggingIn) return
    setIsLoggingIn(true)
    try {
      Taro.showLoading({ title: '登录中...' })
      const loginRes = await Taro.login()
      console.log('[Profile] Taro.login code:', loginRes.code)

      let avatarUrl = tempAvatarUrl
      // 如果选择了头像，先上传到服务器
      if (avatarUrl) {
        try {
          const uploadRes = await Network.uploadFile({
            url: '/api/user/avatar',
            filePath: avatarUrl,
            name: 'file',
          }) as any
          console.log('[Profile] avatar upload:', uploadRes.data)
          avatarUrl = uploadRes.data?.data?.url || avatarUrl
        } catch (err) {
          console.error('[Profile] avatar upload error:', err)
        }
      }

      const nickname = tempNickname || '微信用户'
      const res = await Network.request({
        url: '/api/auth/login',
        method: 'POST',
        data: {
          code: loginRes.code,
          platform: 'weapp',
          nickname,
          avatar_url: avatarUrl,
        },
      })
      Taro.hideLoading()
      console.log('[Profile] login response:', res.data)
      const user = res.data?.data
      if (user) {
        saveUser(user)
        Taro.showToast({ title: '登录成功', icon: 'success' })
      } else {
        Taro.showToast({ title: '登录失败', icon: 'none' })
      }
    } catch (err) {
      Taro.hideLoading()
      console.error('[Profile] login error:', err)
      Taro.showToast({ title: '登录失败，请重试', icon: 'none' })
    } finally {
      setIsLoggingIn(false)
    }
  }

  /** 抖音端登录 */
  const handleTtLogin = async () => {
    if (isLoggingIn) return
    setIsLoggingIn(true)
    try {
      Taro.showLoading({ title: '抖音登录中...' })
      const loginRes = await Taro.login()
      const res = await Network.request({
        url: '/api/auth/login',
        method: 'POST',
        data: { code: loginRes.code, platform: 'tt', nickname: '抖音用户' },
      })
      Taro.hideLoading()
      const user = res.data?.data
      if (user) {
        saveUser(user)
        Taro.showToast({ title: '登录成功', icon: 'success' })
      } else {
        Taro.showToast({ title: '登录失败', icon: 'none' })
      }
    } catch (err) {
      Taro.hideLoading()
      Taro.showToast({ title: '登录失败，请重试', icon: 'none' })
    } finally {
      setIsLoggingIn(false)
    }
  }

  /** H5端登录 */
  const handleH5Login = async () => {
    if (isLoggingIn) return
    setIsLoggingIn(true)
    try {
      const res = await Network.request({
        url: '/api/auth/login',
        method: 'POST',
        data: { code: 'dev_code', platform: 'h5' },
      })
      const user = res.data?.data
      if (user) {
        saveUser(user)
        Taro.showToast({ title: '登录成功', icon: 'success' })
      }
    } catch (err) {
      Taro.showToast({ title: '登录失败', icon: 'none' })
    } finally {
      setIsLoggingIn(false)
    }
  }

  /** 一键登录（非微信端） */
  const handleLogin = async () => {
    const env = Taro.getEnv()
    if (env === Taro.ENV_TYPE.TT) {
      await handleTtLogin()
    } else {
      await handleH5Login()
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
          setTempAvatarUrl('')
          setTempNickname('')
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
          /* 已登录 - 展示用户信息 */
          <View className="flex flex-row items-center gap-4">
            <View className="flex items-center justify-center" style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.2)' }}>
              {userInfo.avatar_url ? (
                <Image src={userInfo.avatar_url} style={{ width: '64px', height: '64px', borderRadius: '50%' }} />
              ) : (
                <Text className="text-2xl">🎮</Text>
              )}
            </View>
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
          /* 未登录 - 微信端用chooseAvatar+nickname，其他端一键登录 */
          <View className="flex flex-col items-center">
            <View
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              {isWeapp && tempAvatarUrl ? (
                <Image src={tempAvatarUrl} style={{ width: '80px', height: '80px', borderRadius: '50%' }} />
              ) : (
                <Text className="text-3xl">🎮</Text>
              )}
            </View>

            {isWeapp ? (
              /* 微信端：选择头像 + 填昵称 + 确认登录 */
              <View className="w-full flex flex-col items-center">
                <View className="flex flex-row items-center gap-3 mb-4 w-full px-4">
                  {/* 选择头像按钮 */}
                  <TaroButton
                    openType="chooseAvatar"
                    onChooseAvatar={handleChooseAvatar}
                    className="border-0 p-0 m-0 bg-transparent rounded-full"
                    style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.2)', lineHeight: 'normal', flexShrink: 0 }}
                  >
                    <View className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                      <Text className="text-lg">📷</Text>
                    </View>
                  </TaroButton>
                  {/* 昵称输入框 - type=nickname 微信会自动填充 */}
                  <View
                    className="flex-1 rounded-xl px-3 py-2"
                    style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                  >
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- TaroInput需要type=nickname */}
                    <TaroInput
                      type="nickname"
                      placeholder="微信昵称"
                      value={tempNickname}
                      onInput={handleNicknameInput}
                      style={{ color: '#fff', fontSize: '15px', width: '100%' }}
                      placeholderStyle="color: rgba(255,255,255,0.5)"
                    />
                  </View>
                </View>
                <Button
                  onClick={handleWeappConfirmLogin}
                  disabled={isLoggingIn}
                  className="border-0 rounded-full px-10 py-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
                >
                  <Text className="text-white text-base font-medium">
                    {isLoggingIn ? '登录中...' : '确认登录'}
                  </Text>
                </Button>
              </View>
            ) : (
              /* 非微信端：一键登录 */
              <>
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
              </>
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
