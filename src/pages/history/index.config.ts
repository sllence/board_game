export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '对局历史', enableShareAppMessage: true, enableShareTimeline: true })
  : { navigationBarTitleText: '对局历史', enableShareAppMessage: true, enableShareTimeline: true }
