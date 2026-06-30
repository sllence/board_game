export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '问题反馈', enableShareAppMessage: true })
  : { navigationBarTitleText: '问题反馈', enableShareAppMessage: true }
