export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '计时器' })
  : { navigationBarTitleText: '计时器' }
