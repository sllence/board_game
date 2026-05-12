export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '计分器' })
  : { navigationBarTitleText: '计分器' }
