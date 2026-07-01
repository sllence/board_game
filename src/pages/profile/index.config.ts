export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '我的', enableShareAppMessage: true, enableShareTimeline: true })
  : { navigationBarTitleText: '我的', enableShareAppMessage: true, enableShareTimeline: true }
