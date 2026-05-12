export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '攻略详情' })
  : { navigationBarTitleText: '攻略详情' }
