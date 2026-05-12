export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '桌游助手' })
  : { navigationBarTitleText: '桌游助手' }
