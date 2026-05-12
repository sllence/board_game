export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '规则详情' })
  : { navigationBarTitleText: '规则详情' }
