export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '计时器', enableShareAppMessage: true, enableShareTimeline: true })
  : { navigationBarTitleText: '计时器', enableShareAppMessage: true, enableShareTimeline: true }
