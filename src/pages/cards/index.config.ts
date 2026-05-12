export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '抽牌' })
  : { navigationBarTitleText: '抽牌' }
