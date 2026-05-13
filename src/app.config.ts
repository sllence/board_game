export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/games/index',
    'pages/tools/index',
    'pages/history/index',
    'pages/profile/index',
    'pages/dice/index',
    'pages/timer/index',
    'pages/cards/index',
    'pages/random/index',
    'pages/scorer/index',
    'pages/navigator/index',
    'pages/rule-detail/index',
    'pages/guide-detail/index',
    'pages/session-detail/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '桌游助手',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#9CA3AF',
    selectedColor: '#4F46E5',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: './assets/tabbar/house.png',
        selectedIconPath: './assets/tabbar/house-active.png',
      },
      {
        pagePath: 'pages/games/index',
        text: '桌游馆',
        iconPath: './assets/tabbar/chess-king.png',
        selectedIconPath: './assets/tabbar/chess-king-active.png',
      },
      {
        pagePath: 'pages/tools/index',
        text: '工具箱',
        iconPath: './assets/tabbar/toolbox.png',
        selectedIconPath: './assets/tabbar/toolbox-active.png',
      },
      {
        pagePath: 'pages/history/index',
        text: '对局',
        iconPath: './assets/tabbar/history.png',
        selectedIconPath: './assets/tabbar/history-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: './assets/tabbar/user.png',
        selectedIconPath: './assets/tabbar/user-active.png',
      }
    ]
  }
})
