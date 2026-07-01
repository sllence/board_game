export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '随机选人', enableShareAppMessage: true, enableShareTimeline: true })
  : { navigationBarTitleText: '随机选人', enableShareAppMessage: true, enableShareTimeline: true }
