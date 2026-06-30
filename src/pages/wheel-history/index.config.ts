export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '转盘历史', enableShareAppMessage: true })
  : { navigationBarTitleText: '转盘历史', enableShareAppMessage: true }
