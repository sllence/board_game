export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '桌游馆', enableShareAppMessage: true })
  : { navigationBarTitleText: '桌游馆', enableShareAppMessage: true }
