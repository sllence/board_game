export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '骰子' })
  : { navigationBarTitleText: '骰子' }
