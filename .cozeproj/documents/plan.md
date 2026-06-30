# 桌游列表 & 对局历史 - 滑动加载分页

## 概述

为桌游馆（Games）和对局历史（History）两个列表页面增加滑动加载（Infinite Scroll）能力，默认展示 10 条数据，滑动到列表底部自动加载下一页的 10 条。后端接口支持 `page` / `page_size` 分页参数，前端使用 ScrollView 的 `onScrollToLower` 实现触底自动加载。

## 技术方案

| 维度 | 选择 | 理由 |
|------|------|------|
| 前端列表容器 | `ScrollView` + `onScrollToLower` | 小程序/ H5 跨端兼容，比页面级 `onReachBottom` 更可控 |
| 分页方式 | 后端 offset-based 分页（page/page_size） | 简单可靠，与现有 SQL 查询兼容 |
| 加载触发器 | 滑到底部自动加载 | 用户明确要求"滑动加载" |
| 加载状态 | 底部展示加载指示器 + 全部加载完毕提示 | 符合移动端交互预期 |
| 后端改动 | GET /api/games 和 GET /api/sessions 增加分页参数 | 最小化改动，保持向后兼容 |

## 功能模块

### 1. 后端分页改造

**GET /api/games**（GamesController.findAll）
- 新增参数: `page`（默认 1）、`page_size`（默认 10）
- 返回结构: `{ data: [...], total: number }`，其中 `total` 为总记录数
- Service 层: `.range((page-1)*page_size, page*page_size - 1)` + `.select('...', { count: 'exact' })`

**GET /api/sessions**（SessionsController.findAll）
- 新增参数: `page`（默认 1）、`page_size`（默认 10）
- 返回结构: `{ data: [...], total: number }`
- Service 层: 同上分页逻辑

### 2. 前端滑动加载改造

**桌游馆页面 (src/pages/games/index.tsx)**
- 新增状态: `page`、`hasMore`、`loadingMore`
- `fetchGames` 改为分页请求，拼接数据（追加而非替换）
- 列表区域用 `ScrollView` 包裹（含固定高度），监听 `onScrollToLower`
- 底部展示：加载中 / 没有更多了

**对局历史页面 (src/pages/history/index.tsx)**
- 移除前端切片逻辑（`all.slice(0, pageNum * PAGE_SIZE)`）
- `fetchSessions` 改为真正的后端分页，拼接数据
- 列表区域用 `ScrollView` 包裹，监听 `onScrollToLower`
- 底部展示：加载中 / 没有更多了
- 筛选切换时重置分页

## 是否有原型设计

是（设计引导工具已开启）

## 实施步骤

### 阶段一：原型设计

1. **原型设计** — 加载 design-canvas 技能，按照 mobile 平台规范设计「滑动加载」交互态的原型页面，包含：列表加载态、触底加载中、全部加载完毕三种状态的视觉展示。完成后提示用户确认，进入开发阶段。

### 阶段二：代码开发

2. **后端分页改造** — 修改 `server/src/modules/games/games.controller.ts`、`server/src/modules/games/games.service.ts`、`server/src/modules/sessions/sessions.controller.ts`、`server/src/modules/sessions/sessions.service.ts`，为 GET /api/games 和 GET /api/sessions 增加 `page` / `page_size` 参数，返回 `{ data, total }`

3. **前端桌游馆滑动加载** — 改造 `src/pages/games/index.tsx`，使用 ScrollView 包裹列表 + onScrollToLower 触发加载，状态管理 page/hasMore/loadingMore，数据追加而非替换

4. **前端对局历史滑动加载** — 改造 `src/pages/history/index.tsx`，移除前端切片逻辑，改用后端分页，ScrollView + onScrollToLower，滑动自动加载

5. **API 测试与前后端匹配验证** — 使用 curl 测试两个分页接口，验证请求/响应结构与前端调用一致

6. **校验与构建** — 执行 `pnpm validate` 和 `pnpm build`，确保无错误

## 页面规格

### 全局导航

##### @nav(mobile-tabbar)
> type: tabbar
> platform: mobile

- @page(/) 首页 | icon: house
- @page(/games) 桌游馆 | icon: chess-king
- @page(/tools) 工具箱 | icon: toolbox
- @page(/history) 对局 | icon: history
- @page(/profile) 我的 | icon: user

### 页面详情

##### @page(/games) 桌游馆

**核心职责**：展示桌游列表，支持筛选搜索和滑动加载分页。
**访问路径**：TabBar "桌游馆" 直达。

**布局**：
- 顶部：标题 + 搜索栏
- 筛选栏：类型/场景/人数/时长/难度 + 重置按钮
- 列表区域：ScrollView 包裹的桌游卡片列表
- 列表底部：加载更多指示器 / 没有更多了

**交互说明**

| 元素 | 动作 | 响应 | 传参 | 备注 |
|------|------|------|------|------|
| 列表 | 滑动到底部 | 自动加载下一页 | page+1 | 有更多数据时 |
| 筛选/搜索 | 变更 | 重置为第1页重新加载 | page=1 | — |
| 桌游卡片 | 点击 | 跳转 @page(/rule-detail)?id | game.id | — |

##### @page(/history) 对局历史

**核心职责**：展示用户对局记录，支持筛选切换和滑动加载分页。
**访问路径**：TabBar "对局" 直达。

**布局**：
- 顶部：渐变标题区 + 所有权/状态下拉筛选
- 列表区域：ScrollView 包裹的对局卡片列表
- 列表底部：加载更多指示器 / 没有更多了

**交互说明**

| 元素 | 动作 | 响应 | 传参 | 备注 |
|------|------|------|------|------|
| 列表 | 滑动到底部 | 自动加载下一页 | page+1 | 有更多数据时 |
| 筛选切换 | 变更 | 重置为第1页重新加载 | page=1 | — |
| 对局卡片 | 点击 | 跳转 @page(/navigator)?sessionId | session.id | — |