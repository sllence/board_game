export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '桌游管理', enableShareAppMessage: true, enableShareTimeline: true })
  : { navigationBarTitleText: '桌游管理', enableShareAppMessage: true, enableShareTimeline: true }
