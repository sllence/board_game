export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '对局海报' })
  : { navigationBarTitleText: '对局海报' }