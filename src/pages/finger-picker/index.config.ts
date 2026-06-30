export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '手指选人',
      navigationBarBackgroundColor: '#0a0a0f',
      navigationBarTextStyle: 'white',
    })
  : {
      navigationBarTitleText: '手指选人',
      navigationBarBackgroundColor: '#0a0a0f',
      navigationBarTextStyle: 'white',
    }
