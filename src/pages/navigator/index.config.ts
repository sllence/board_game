export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '对局领航' })
  : { navigationBarTitleText: '对局领航' }
