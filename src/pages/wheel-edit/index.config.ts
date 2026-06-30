export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '编辑转盘', enableShareAppMessage: true })
  : { navigationBarTitleText: '编辑转盘', enableShareAppMessage: true }
