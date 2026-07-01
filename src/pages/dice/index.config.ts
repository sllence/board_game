export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '骰子', enableShareAppMessage: true, enableShareTimeline: true })
  : { navigationBarTitleText: '骰子', enableShareAppMessage: true, enableShareTimeline: true }
