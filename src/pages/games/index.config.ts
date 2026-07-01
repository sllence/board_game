export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '桌游馆', enableShareAppMessage: true, enableShareTimeline: true })
  : { navigationBarTitleText: '桌游馆', enableShareAppMessage: true, enableShareTimeline: true }
