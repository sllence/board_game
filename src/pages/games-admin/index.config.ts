export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '桌游管理', enableShareAppMessage: true })
  : { navigationBarTitleText: '桌游管理', enableShareAppMessage: true }
