export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '工具箱', enableShareAppMessage: true })
  : { navigationBarTitleText: '工具箱', enableShareAppMessage: true }
