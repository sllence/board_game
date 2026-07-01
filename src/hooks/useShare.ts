import { useShareAppMessage, useShareTimeline } from '@tarojs/taro'

export function useShare(title?: string, imageUrl?: string) {
  useShareAppMessage(() => {
    const config: any = {
      title: title || '数智局伴',
    }
    if (imageUrl) {
      config.imageUrl = imageUrl
    }
    return config
  })

  useShareTimeline(() => {
    const config: any = {
      title: title || '数智局伴',
    }
    if (imageUrl) {
      config.imageUrl = imageUrl
    }
    return config
  })
}