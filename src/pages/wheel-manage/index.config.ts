export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '我的转盘' })
  : { navigationBarTitleText: '我的转盘' }
