export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '计分器', enableShareAppMessage: true, enableShareTimeline: true })
  : { navigationBarTitleText: '计分器', enableShareAppMessage: true, enableShareTimeline: true }
