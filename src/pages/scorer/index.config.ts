export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '计分器', enableShareAppMessage: true })
  : { navigationBarTitleText: '计分器', enableShareAppMessage: true }
