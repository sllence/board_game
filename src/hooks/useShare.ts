import { useShareAppMessage } from '@tarojs/taro'

export function useShare(title?: string) {
  useShareAppMessage(() => {
    return {
      title: title || '数智局伴',
    }
  })
}