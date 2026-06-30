export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '我的转盘', enableShareAppMessage: true })
  : { navigationBarTitleText: '我的转盘', enableShareAppMessage: true }
