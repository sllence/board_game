export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '规则详情', enableShareAppMessage: true, enableShareTimeline: true })
  : { navigationBarTitleText: '规则详情', enableShareAppMessage: true, enableShareTimeline: true }
