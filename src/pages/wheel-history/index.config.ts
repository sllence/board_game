export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '转盘历史' })
  : { navigationBarTitleText: '转盘历史' }
