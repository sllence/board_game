export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '攻略详情', enableShareAppMessage: true, enableShareTimeline: true })
  : { navigationBarTitleText: '攻略详情', enableShareAppMessage: true, enableShareTimeline: true }
