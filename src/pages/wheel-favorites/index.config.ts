export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '我的收藏', enableShareAppMessage: true })
  : { navigationBarTitleText: '我的收藏', enableShareAppMessage: true }
