export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '数智局伴', enableShareAppMessage: true, enableShareTimeline: true })
  : { navigationBarTitleText: '数智局伴', enableShareAppMessage: true, enableShareTimeline: true }
