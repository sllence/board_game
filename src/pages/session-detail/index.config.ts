export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '对局详情' })
  : { navigationBarTitleText: '对局详情' }
