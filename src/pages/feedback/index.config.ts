export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '问题反馈' })
  : { navigationBarTitleText: '问题反馈' }
