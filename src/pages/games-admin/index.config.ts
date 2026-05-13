export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '桌游管理' })
  : { navigationBarTitleText: '桌游管理' }
