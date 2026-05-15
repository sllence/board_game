export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '转盘' })
  : { navigationBarTitleText: '转盘' }
