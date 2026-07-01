export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '工具箱', enableShareAppMessage: true, enableShareTimeline: true })
  : { navigationBarTitleText: '工具箱', enableShareAppMessage: true, enableShareTimeline: true }
