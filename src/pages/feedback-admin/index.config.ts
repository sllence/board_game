export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '反馈管理' })
  : { navigationBarTitleText: '反馈管理' }
