export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '攻略详情', enableShareAppMessage: true })
  : { navigationBarTitleText: '攻略详情', enableShareAppMessage: true }
