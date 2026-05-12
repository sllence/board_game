export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '对局历史' })
  : { navigationBarTitleText: '对局历史' }
