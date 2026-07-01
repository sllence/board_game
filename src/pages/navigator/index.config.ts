export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '对局领航', enableShareAppMessage: true, enableShareTimeline: true })
  : { navigationBarTitleText: '对局领航', enableShareAppMessage: true, enableShareTimeline: true }
