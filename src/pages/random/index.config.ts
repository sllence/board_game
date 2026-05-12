export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '随机选人' })
  : { navigationBarTitleText: '随机选人' }
