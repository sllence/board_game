import { useShareAppMessage } from '@tarojs/taro'

export function useShare(moduleName?: string) {
  useShareAppMessage(() => {
    return {
      title: moduleName ? `数智局伴-${moduleName}` : '数智局伴',
      path: '/pages/index/index',
    }
  })
}