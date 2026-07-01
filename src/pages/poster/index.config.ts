export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '对局海报', enableShareAppMessage: true, enableShareTimeline: true })
  : { navigationBarTitleText: '对局海报', enableShareAppMessage: true, enableShareTimeline: true }