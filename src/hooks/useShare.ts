import { useShareAppMessage } from '@tarojs/taro'

interface ShareConfig {
  title?: string
  path?: string
  imageUrl?: string
}

export function useShare(config?: ShareConfig | (() => ShareConfig)) {
  useShareAppMessage(() => {
    if (typeof config === 'function') {
      return config()
    }
    return {
      title: config?.title || '数智局伴',
      path: config?.path || '/pages/index/index',
      ...(config?.imageUrl ? { imageUrl: config.imageUrl } : {}),
    }
  })
}