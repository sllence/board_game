# 桌游助手（Board Game Buddy）设计指南

## 品牌定位
- **定位**: 线下桌游辅助工具，规则查询+计分+计时+骰子一站式整合
- **风格**: Bento Grid + Flat Design 混合 — 干净现代、卡片化布局、游戏感渐变点缀
- **目标用户**: 桌游爱好者、聚会组织者、桌游新手

## 配色方案
| 类别 | 色值 | Tailwind 类名 | 用途 |
|------|------|---------------|------|
| 主色(靛蓝) | #4F46E5 | bg-primary / text-primary | 主按钮、导航高亮、标题 |
| 强调色(橙) | #F97316 | bg-orange-500 | CTA按钮、重要操作 |
| 辅助紫 | #818CF8 | bg-indigo-400 | 渐变辅助、图标背景 |
| 成功绿 | #22C55E | bg-green-500 | 成功、确认 |
| 警告黄 | #F59E0B | bg-amber-500 | 提示、警告 |
| 危险红 | #EF4444 | bg-red-500 | 删除、危险操作 |
| 页面背景 | #F5F5F7 | bg-[#f5f5f7] | 页面底色 |
| 卡片背景 | #FFFFFF | bg-white | 卡片底色 |
| 主文字 | #1E1B4B | text-[#1e1b4b] | 标题、正文 |
| 次要文字 | #6B7280 | text-gray-500 | 副标题、说明 |
| 弱文字 | #9CA3AF | text-gray-400 | 占位符、时间戳 |

## 渐变卡片配色（游戏感）
| 游戏/场景 | 渐变 | Tailwind 类名 |
|-----------|------|---------------|
| 策略类 | 紫→靛 | bg-gradient-to-br from-indigo-500 to-purple-600 |
| 社交类 | 紫→蓝 | bg-gradient-to-br from-violet-500 to-blue-600 |
| 派对类 | 橙→红 | bg-gradient-to-br from-orange-400 to-rose-500 |
| 工具卡片 | 靛→蓝 | bg-gradient-to-br from-indigo-500 to-blue-500 |
| 计时/骰子 | 紫→粉 | bg-gradient-to-br from-purple-500 to-pink-500 |

## 字体规范
| 层级 | Tailwind 类名 | 用途 |
|------|---------------|------|
| H1 | text-2xl font-bold | 页面标题 |
| H2 | text-lg font-semibold | 区块标题 |
| H3 | text-base font-semibold | 卡片标题 |
| Body | text-sm | 正文内容 |
| Caption | text-xs text-gray-400 | 辅助信息 |

## 间距系统
| 类别 | Tailwind 类名 | 值 |
|------|---------------|-----|
| 页面边距 | px-4 | 16px |
| 卡片内边距 | p-4 | 16px |
| 列表间距 | gap-3 | 12px |
| 区块间距 | gap-5 / mb-5 | 20px |

## 容器样式
| 类别 | Tailwind 类名 |
|------|---------------|
| 卡片 | bg-white rounded-2xl shadow-sm p-4 |
| 渐变卡片 | bg-gradient-to-br from-X to-Y rounded-2xl p-4 text-white |
| 小圆角 | rounded-xl |
| 标签圆角 | rounded-full |

## 组件使用原则
- **按钮**: 优先使用 `@/components/ui/button`
- **输入框**: 优先使用 `@/components/ui/input`，View包裹样式
- **卡片容器**: 优先使用 `@/components/ui/card`
- **弹窗**: 优先使用 `@/components/ui/dialog`
- **标签**: 优先使用 `@/components/ui/badge`
- **标签页**: 优先使用 `@/components/ui/tabs`
- **通用 UI 不用 View/Text 手搓**

## 导航结构
- TabBar: 首页(House) / 桌游馆(ChessKing) / 工具箱(Toolbox) / 对局(History) / 我的(User)
- TabBar 颜色: 未选中 #9CA3AF, 选中 #4F46E5

## 小程序约束
- 不使用硬编码 px 值（Tailwind 任意值如 w-[300px] 禁止）
- 图片资源走 TOS 对象存储，TabBar 图标放 src/assets/tabbar
- 不使用 Tailwind 透明度简写（bg-primary/10），改用 bg-primary bg-opacity-10
- 不使用小数间距（space-y-1.5），改用整数（space-y-2）
