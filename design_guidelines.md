# 桌游助手（Board Game Buddy）设计指南

## 品牌定位
- **定位**: 线下桌游辅助工具，规则查询+计分+计时+骰子一站式整合
- **风格**: 深色沉稳+活泼点缀，兼顾策略游戏的专业感与聚会游戏的趣味感
- **目标用户**: 桌游爱好者、聚会组织者、桌游新手

## 配色方案
| 类别 | 色值 | Tailwind 类名 | 用途 |
|------|------|---------------|------|
| 主色(深蓝) | #1a1a2e | text-[#1a1a2e] / bg-[#1a1a2e] | 标题、主按钮、导航高亮 |
| 强调色(红) | #e94560 | text-rose-500 / bg-rose-500 | 重要操作、高亮标签 |
| 辅助蓝 | #3b82f6 | text-blue-500 / bg-blue-500 | 链接、辅助按钮 |
| 辅助黄 | #f59e0b | text-amber-500 / bg-amber-500 | 提示、警告 |
| 成功绿 | #22c55e | text-green-500 / bg-green-500 | 成功、确认 |
| 页面背景 | #f5f5f7 | bg-[#f5f5f7] | 页面底色 |
| 卡片背景 | #ffffff | bg-white | 卡片、弹窗底色 |
| 次要文字 | #555570 | text-[#555570] | 副标题、说明 |
| 弱文字 | #9999aa | text-[#9999aa] | 占位符、时间戳 |

## 字体规范
| 层级 | Tailwind 类名 | 用途 |
|------|---------------|------|
| H1 | text-2xl font-bold | 页面标题 |
| H2 | text-lg font-semibold | 区块标题 |
| H3 | text-base font-semibold | 卡片标题 |
| Body | text-sm | 正文内容 |
| Caption | text-xs text-[#9999aa] | 辅助信息 |

## 间距系统
| 类别 | Tailwind 类名 | 值 |
|------|---------------|-----|
| 页面边距 | px-4 | 16px |
| 卡片内边距 | p-3.5 | 14px |
| 列表间距 | gap-3 | 12px |
| 区块间距 | gap-4 / mb-4 | 16px |

## 容器样式
| 类别 | Tailwind 类名 |
|------|---------------|
| 大圆角 | rounded-xl |
| 中圆角 | rounded-lg |
| 小圆角 | rounded-md |
| 阴影 | shadow-sm |
| 卡片 | bg-white rounded-xl shadow-sm p-3.5 |

## 组件使用原则
- **按钮**: 优先使用 `@/components/ui/button`
- **输入框**: 优先使用 `@/components/ui/input`，View包裹样式
- **卡片容器**: 优先使用 `@/components/ui/card`
- **折叠面板**: 优先使用 `@/components/ui/accordion`
- **标签切换**: 优先使用 `@/components/ui/tabs`
- **弹窗**: 优先使用 `@/components/ui/dialog`
- **提示**: 优先使用 `@/components/ui/toast`
- **徽章**: 优先使用 `@/components/ui/badge`
- **骨架屏**: 优先使用 `@/components/ui/skeleton`
- **分隔线**: 优先使用 `@/components/ui/separator`
- **新页面开发前**: 先拆分UI单元 → 映射到组件库 → 不手搓通用组件

## 导航结构
- **TabBar 5页**: 首页(House) | 桌游馆(Gamepad2) | 工具箱(Wrench) | 对局历史(Clock) | 我的(User)
- TabBar颜色: color=#9999aa, selectedColor=#1a1a2e, backgroundColor=#ffffff
- TabBar页面跳转用 `switchTab()`，普通页面用 `navigateTo()`

## 状态展示
- **加载态**: 使用 Skeleton 骨架屏
- **空状态**: 居中图标+文案+引导按钮
- **错误态**: 轻提示 Toast

## 小程序约束
- 图片/视频走 TOS 对象存储，禁止打包进项目
- TabBar 图标用本地 PNG（81x81）
- 避免大包体积，规则数据存后端
