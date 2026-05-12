export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '工具箱' })
  : { navigationBarTitleText: '工具箱' }
