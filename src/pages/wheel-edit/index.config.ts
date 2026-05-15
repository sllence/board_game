export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '编辑转盘' })
  : { navigationBarTitleText: '编辑转盘' }
