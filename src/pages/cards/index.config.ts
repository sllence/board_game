export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '抽牌', enableShareAppMessage: true })
  : { navigationBarTitleText: '抽牌', enableShareAppMessage: true }
