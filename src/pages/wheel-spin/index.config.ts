export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '转盘', enableShareAppMessage: true })
  : { navigationBarTitleText: '转盘', enableShareAppMessage: true }
