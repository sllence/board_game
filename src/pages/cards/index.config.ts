export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '抽牌', enableShareAppMessage: true, enableShareTimeline: true })
  : { navigationBarTitleText: '抽牌', enableShareAppMessage: true, enableShareTimeline: true }
