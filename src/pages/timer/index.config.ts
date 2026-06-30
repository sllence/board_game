export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '计时器', enableShareAppMessage: true })
  : { navigationBarTitleText: '计时器', enableShareAppMessage: true }
