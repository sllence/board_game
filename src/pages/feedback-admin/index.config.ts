export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '反馈管理', enableShareAppMessage: true })
  : { navigationBarTitleText: '反馈管理', enableShareAppMessage: true }
