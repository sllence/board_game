export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '数智局伴' })
  : { navigationBarTitleText: '数智局伴' }
