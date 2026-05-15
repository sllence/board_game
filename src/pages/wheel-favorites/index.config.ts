export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '收藏的转盘' })
  : { navigationBarTitleText: '收藏的转盘' }
