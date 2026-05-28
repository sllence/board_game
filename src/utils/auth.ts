import Taro from '@tarojs/taro'

export const checkLogin = (): boolean => {
  const userInfo = Taro.getStorageSync('userInfo')
  const token = Taro.getStorageSync('token')
  return !!(userInfo && token)
}

export const getCurrentUser = (): { id: number; [key: string]: any } | null => {
  try {
    const userInfo = Taro.getStorageSync('userInfo')
    if (!userInfo) return null
    return JSON.parse(userInfo)
  } catch {
    return null
  }
}

export const requireLogin = (callback: () => void): void => {
  if (checkLogin()) {
    callback()
  } else {
    Taro.showModal({
      title: '需要登录',
      content: '请先登录后再使用此功能',
      confirmText: '去登录',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          Taro.switchTab({ url: '/pages/profile/index' })
        }
      }
    })
  }
}