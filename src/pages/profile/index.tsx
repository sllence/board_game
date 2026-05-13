import { View, Text, Image, Button as TaroButton, Input as TaroInput } from '@tarojs/components' // eslint-disable-line no-restricted-syntax
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Network } from '@/network'
import type { FC } from 'react'

interface UserInfo {
  id: number
  nickname: string
  avatar_url: string
  total_games: number
  total_wins: number
  total_time: number
  is_admin?: boolean
}

const ProfilePage: FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [tempAvatarUrl, setTempAvatarUrl] = useState<string | null>(null)
  const [tempNickname, setTempNickname] = useState<string | null>(null)
  const [showProfileSetup, setShowProfileSetup] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)

  const isMiniApp = [Taro.ENV_TYPE.WEAPP, Taro.ENV_TYPE.TT].includes(Taro.getEnv() as any)

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

  const handleWeChatLogin = async () => {
    if (!isMiniApp) {
      Taro.showToast({ title: '请在小程序中体验', icon: 'none' })
      return
    }

    setIsLoggingIn(true)
    try {
      const { code } = await Taro.login()
      const res = await Network.request({
        url: '/api/auth/login',
        method: 'POST',
        data: { code, platform: 'weapp' }
      }) as any

      let user = res.data.data
      
      // 检查本地是否有缓存的用户信息（头像和昵称）
      const cachedUserInfo = Taro.getStorageSync('userInfo')
      if (cachedUserInfo) {
        try {
          const cachedUser = JSON.parse(cachedUserInfo)
          // 如果本地缓存有头像和昵称，优先使用本地的
          if (cachedUser.nickname || cachedUser.avatar_url) {
            user = {
              ...user,
              nickname: cachedUser.nickname || user.nickname,
              avatar_url: cachedUser.avatar_url || user.avatar_url
            }
          }
        } catch {
          // ignore parse error
        }
      }
      
      setUserInfo(user)
      Taro.setStorageSync('userInfo', JSON.stringify(user))

      // 只有在本地和后端都没有头像和昵称时，才弹出设置弹窗
      if (!user.nickname || !user.avatar_url) {
        setShowProfileSetup(true)
      } else {
        Taro.showToast({ title: '登录成功', icon: 'success' })
      }
    } catch (err) {
      console.error('登录失败', err)
      Taro.showToast({ title: '登录失败', icon: 'none' })
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleChooseAvatar = async (e: any) => {
    const tempFilePath = e.detail.avatarUrl
    setTempAvatarUrl(tempFilePath)
  }

  const handleNicknameInput = (e: any) => {
    setTempNickname(e.detail.value)
  }

  const handleConfirmProfile = async () => {
    if (!tempNickname) {
      Taro.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }

    setIsLoggingIn(true)
    try {
      let avatarUrl = userInfo?.avatar_url || ''

      // 如果选择了头像，先上传头像
      if (tempAvatarUrl) {
        try {
          console.log('[uploadAvatar] uploading avatar...')
          const uploadRes = await Network.uploadFile({
            url: '/api/user/avatar',
            filePath: tempAvatarUrl,
            name: 'file',
            formData: {
              user_id: String(userInfo?.id)
            }
          }) as any
          console.log('[uploadAvatar] response:', uploadRes)
          
          // 解析上传结果
          let uploadData
          if (typeof uploadRes.data === 'string') {
            uploadData = JSON.parse(uploadRes.data)
          } else if (uploadRes.data && typeof uploadRes.data === 'object') {
            uploadData = uploadRes.data
          } else {
            uploadData = uploadRes
          }
          
          // 获取头像URL，兼容不同的返回格式
          avatarUrl = uploadData.data?.avatar_url || uploadData.data?.url || uploadData.avatar_url || uploadData.url || ''
          console.log('[uploadAvatar] got avatarUrl:', avatarUrl)
        } catch (uploadErr) {
          console.error('[uploadAvatar] upload failed:', uploadErr)
          // 头像上传失败不阻止昵称保存，继续保存昵称
        }
      }

      // 更新用户信息（昵称 + 头像URL）
      console.log('[updateProfile] updating profile...')
      await Network.request({
        url: '/api/user/profile',
        method: 'PUT',
        data: { 
          user_id: userInfo?.id,
          nickname: tempNickname,
          ...(avatarUrl ? { avatar_url: avatarUrl } : {})
        }
      })

      // 更新成功
      const updatedUser = {
        ...userInfo!,
        nickname: tempNickname,
        avatar_url: avatarUrl
      }
      setUserInfo(updatedUser)
      Taro.setStorageSync('userInfo', JSON.stringify(updatedUser))
      setShowProfileSetup(false)
      Taro.showToast({ title: '保存成功', icon: 'success' })
    } catch (err) {
      console.error('[handleConfirmProfile] save failed:', err)
      Taro.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleSkipProfile = () => {
    setShowProfileSetup(false)
    setTempAvatarUrl(null)
    setTempNickname(null)
    Taro.showToast({ title: '登录成功', icon: 'success' })
  }

  const handleOpenEditProfile = () => {
    setTempAvatarUrl(userInfo?.avatar_url || null)
    setTempNickname(userInfo?.nickname || '')
    setShowEditProfile(true)
  }

  const handleSaveEditProfile = async () => {
    if (!tempNickname) {
      Taro.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }

    setIsLoggingIn(true)
    try {
      let avatarUrl = userInfo?.avatar_url || ''

      // 如果选择了新头像，先上传头像
      if (tempAvatarUrl && tempAvatarUrl !== userInfo?.avatar_url) {
        try {
          console.log('[uploadAvatar] uploading new avatar...')
          const uploadRes = await Network.uploadFile({
            url: '/api/user/avatar',
            filePath: tempAvatarUrl,
            name: 'file',
            formData: {
              user_id: String(userInfo?.id)
            }
          }) as any
          console.log('[uploadAvatar] response:', uploadRes)
          
          let uploadData
          if (typeof uploadRes.data === 'string') {
            uploadData = JSON.parse(uploadRes.data)
          } else if (uploadRes.data && typeof uploadRes.data === 'object') {
            uploadData = uploadRes.data
          } else {
            uploadData = uploadRes
          }
          
          avatarUrl = uploadData.data?.avatar_url || uploadData.data?.url || uploadData.avatar_url || uploadData.url || ''
          console.log('[uploadAvatar] got new avatarUrl:', avatarUrl)
        } catch (uploadErr) {
          console.error('[uploadAvatar] upload failed:', uploadErr)
          avatarUrl = userInfo?.avatar_url || ''
        }
      }

      // 更新用户信息
      console.log('[updateProfile] updating profile...')
      await Network.request({
        url: '/api/user/profile',
        method: 'PUT',
        data: { 
          user_id: userInfo?.id,
          nickname: tempNickname,
          ...(avatarUrl ? { avatar_url: avatarUrl } : {})
        }
      })

      const updatedUser = {
        ...userInfo!,
        nickname: tempNickname,
        avatar_url: avatarUrl
      }
      setUserInfo(updatedUser)
      Taro.setStorageSync('userInfo', JSON.stringify(updatedUser))
      setShowEditProfile(false)
      setTempAvatarUrl(null)
      setTempNickname(null)
      Taro.showToast({ title: '保存成功', icon: 'success' })
    } catch (err) {
      console.error('[handleSaveEditProfile] save failed:', err)
      Taro.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      setIsLoggingIn(false)
    }
  }

  const MENU_ITEMS = [
    { emoji: '❤️', name: '我的收藏', desc: '收藏的桌游和攻略', soon: true },
    { emoji: '⚙️', name: '设置', desc: '主题、通知等偏好', soon: true },
  ]

  const ADMIN_MENU_ITEMS = [
    { emoji: '🛠️', name: '桌游管理', desc: '编辑和管理桌游信息' },
  ]

  if (!userInfo) {
    return (
      <View className="flex flex-col min-h-screen bg-[#f5f5f7]">
        <View className="px-5 pt-20 pb-8" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
          <View className="flex items-center justify-center mb-8" style={{ width: '80px', height: '80px', borderRadius: '24px', backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <Text className="text-3xl">🎮</Text>
          </View>
          <Text className="block text-2xl font-bold text-white text-center mb-2">欢迎来到桌游助手</Text>
          <Text className="block text-white text-center opacity-80 mb-8">登录后解锁更多功能</Text>
          <View className="flex flex-col gap-3">
            {isMiniApp && (
              <Button
                size="lg"
                className="w-full bg-white text-indigo-600 border-0"
                onClick={handleWeChatLogin}
                disabled={isLoggingIn}
              >
                <Text className="font-medium">{isLoggingIn ? '登录中...' : '微信一键登录'}</Text>
              </Button>
            )}
          </View>
        </View>
        <View className="flex-1 flex items-center justify-center">
          <Text className="text-gray-400 text-xs">登录后可体验完整功能</Text>
        </View>
      </View>
    )
  }

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
          <View className="flex flex-row gap-2">
            <Button
              size="sm"
              onClick={handleOpenEditProfile}
              className="border-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
            >
              <Text className="text-white text-xs">编辑</Text>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setUserInfo(null)
                Taro.removeStorageSync('userInfo')
                Taro.showToast({ title: '已退出', icon: 'success' })
                // 退出后跳转到首页
                setTimeout(() => {
                  Taro.switchTab({ url: '/pages/index/index' })
                }, 500)
              }}
              className="border-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
            >
              <Text className="text-white text-xs">退出</Text>
            </Button>
          </View>
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
        {/* 管理员菜单 - 仅管理员可见 */}
        {userInfo?.is_admin && ADMIN_MENU_ITEMS.map((item) => (
          <Card 
            key={item.name} 
            className="border-0 shadow-sm mb-3" 
            onClick={() => {
              if (item.name === '桌游管理') {
                Taro.navigateTo({ url: '/pages/games-admin/index' })
              }
            }}
          >
            <CardContent className="flex flex-row items-center p-4">
              <Text className="text-xl mr-3">{item.emoji}</Text>
              <View className="flex-1">
                <Text className="block text-sm font-medium text-gray-800">{item.name}</Text>
                <Text className="block text-xs text-gray-400 mb-1">{item.desc}</Text>
              </View>
              <View
                className="rounded-full px-2 py-1"
                style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}
              >
                <Text className="text-xs text-red-500">管理</Text>
              </View>
            </CardContent>
          </Card>
        ))}
        {/* 普通菜单 */}
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

      {/* 设置头像昵称弹窗 - 首次登录时弹出 */}
      {showProfileSetup && (
        <View className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="bg-white rounded-2xl p-6 mx-6 w-full max-w-sm">
            <Text className="block text-lg font-bold text-gray-900 mb-2">完善个人信息</Text>
            <Text className="block text-sm text-gray-500 mb-6">首次登录请设置头像和昵称</Text>
            <View className="flex flex-col items-center mb-6">
              {isMiniApp ? (
                <TaroButton
                  openType="chooseAvatar"
                  onChooseAvatar={handleChooseAvatar}
                  className="border-0 p-0 bg-transparent w-auto h-auto"
                >
                  <View 
                    className="flex items-center justify-center relative"
                    style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#f3f4f6' }}
                  >
                    {tempAvatarUrl ? (
                      <Image src={tempAvatarUrl} style={{ width: '80px', height: '80px' }} />
                    ) : (
                      <Text className="text-2xl">🎮</Text>
                    )}
                    <View 
                      className="absolute bottom-0 left-0 right-0 flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(0,0,0,0.5)', height: '24px' }}
                    >
                      <Text className="text-white text-xs">点击更换</Text>
                    </View>
                  </View>
                </TaroButton>
              ) : (
                <View 
                  className="flex items-center justify-center"
                  style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#f3f4f6' }}
                >
                  {tempAvatarUrl ? (
                    <Image src={tempAvatarUrl} style={{ width: '80px', height: '80px' }} />
                  ) : (
                    <Text className="text-2xl">🎮</Text>
                  )}
                </View>
              )}
            </View>
            <View className="mb-6">
              <Text className="block text-sm font-medium text-gray-700 mb-2">昵称</Text>
              {isMiniApp ? (
                <TaroInput
                  type="nickname"
                  placeholder="请输入昵称"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl"
                  onInput={handleNicknameInput}
                  value={tempNickname || ''}
                />
              ) : (
                <View className="w-full px-4 py-3 bg-gray-50 rounded-xl">
                  <Text className="text-sm text-gray-400">请在小程序中设置</Text>
                </View>
              )}
            </View>
            <View className="flex flex-row gap-3">
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={handleSkipProfile}
              >
                <Text>跳过</Text>
              </Button>
              <Button
                size="lg"
                className="flex-1"
                onClick={handleConfirmProfile}
                disabled={isLoggingIn}
              >
                <Text>{isLoggingIn ? '保存中...' : '保存'}</Text>
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* 编辑用户信息弹窗 */}
      {showEditProfile && (
        <View className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="bg-white rounded-2xl p-6 mx-6 w-full max-w-sm">
            <Text className="block text-lg font-bold text-gray-900 mb-2">编辑个人信息</Text>
            <View className="flex flex-col items-center mb-6">
              {isMiniApp ? (
                <TaroButton
                  openType="chooseAvatar"
                  onChooseAvatar={handleChooseAvatar}
                  className="border-0 p-0 bg-transparent w-auto h-auto"
                >
                  <View 
                    className="flex items-center justify-center relative"
                    style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#f3f4f6' }}
                  >
                    {tempAvatarUrl ? (
                      <Image src={tempAvatarUrl} style={{ width: '80px', height: '80px' }} />
                    ) : (
                      <Text className="text-2xl">🎮</Text>
                    )}
                    <View 
                      className="absolute bottom-0 left-0 right-0 flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(0,0,0,0.5)', height: '24px' }}
                    >
                      <Text className="text-white text-xs">点击更换</Text>
                    </View>
                  </View>
                </TaroButton>
              ) : (
                <View 
                  className="flex items-center justify-center"
                  style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#f3f4f6' }}
                >
                  {tempAvatarUrl ? (
                    <Image src={tempAvatarUrl} style={{ width: '80px', height: '80px' }} />
                  ) : (
                    <Text className="text-2xl">🎮</Text>
                  )}
                </View>
              )}
            </View>
            <View className="mb-6">
              <Text className="block text-sm font-medium text-gray-700 mb-2">昵称</Text>
              {isMiniApp ? (
                <TaroInput
                  type="nickname"
                  placeholder="请输入昵称"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl"
                  onInput={handleNicknameInput}
                  value={tempNickname || ''}
                />
              ) : (
                <View className="w-full px-4 py-3 bg-gray-50 rounded-xl">
                  <Text className="text-sm text-gray-400">请在小程序中设置</Text>
                </View>
              )}
            </View>
            <View className="flex flex-row gap-3">
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => {
                  setShowEditProfile(false)
                  setTempAvatarUrl(null)
                  setTempNickname(null)
                }}
              >
                <Text>取消</Text>
              </Button>
              <Button
                size="lg"
                className="flex-1"
                onClick={handleSaveEditProfile}
                disabled={isLoggingIn}
              >
                <Text>{isLoggingIn ? '保存中...' : '保存'}</Text>
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

export default ProfilePage