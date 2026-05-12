export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '桌游馆' })
  : { navigationBarTitleText: '桌游馆' }
