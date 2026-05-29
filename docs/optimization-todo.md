# 待优化事项

## P0 — 立即修复

| # | 优化项 | 说明 |
|---|---|---|
| 1 | **统一 API 解包层** | 创建 `src/utils/request.ts`，封装 `get<T>(url)` / `post<T>(url, data)`，统一处理 `res.data.data` 解包、401 跳转登录、错误 toast |
| 2 | **提取共享常量** | 将 `TYPE_META`、`SCENE_META`、`DIFFICULTY_MAP`、`ICON_KEY_MAP` 抽取到 `src/constants/game.ts`，消除重复 |
| 3 | **Profile 页头像上传去重** | 提取 `useAvatarUpload` hook 或公共函数，消除约 60 行重复代码 |

## P1 — 近期优化

| # | 优化项 | 说明 |
|---|---|---|
| 4 | **引入 Zustand 管理核心状态** | 至少建立 `useUserStore`（登录态 + 用户信息）、`useWheelStore`（转盘数据），避免每个页面各自读 storage |
| 5 | **页面拆分** | Profile 页拆为 `ProfilePage` + `LoginSection` + `EditProfileModal` + `ProfileSetupModal`；Dice 页拆出 `DiceSettings`、`DiceCup` 等子组件 |
| 6 | **清理未使用依赖** | 移除 `drizzle-orm`、`drizzle-kit`、`drizzle-zod`（实际未使用）；清理 `cannon-es` 如不再使用 |
| 7 | **修复 H5 兼容性** | `games/index.tsx` 下拉遮罩改用 Sheet/Dialog 组件；Profile H5 登录弹窗使用 ui 组件库 Input；`dice/index.tsx` 的 CSS 动画改为独立 CSS 文件 |
| 8 | **添加网络请求拦截器** | 在 Network 层增加统一的请求/响应拦截，处理 401 自动登出、网络异常提示、loading 状态管理 |

## P2 — 中期规划

| # | 优化项 | 说明 |
|---|---|---|
| 9 | **后端 AuthModule 合并** | 统一 `auth.module.ts`，消除两套认证模块并存 |
| 10 | **引入 DTO + Zod 验证** | 为所有 Controller 添加 DTO 校验层（Zod 已安装），替代裸 `any` 类型 |
| 11 | **单元测试** | 引入 Vitest，优先覆盖 `src/utils/`、`src/lib/` 纯函数；后端覆盖 Service 层核心逻辑 |
| 12 | **TypeScript 严格化** | 开启 `noImplicitAny: true`，逐步修复类型错误 |
| 13 | **Taro 原生 Text 规范化** | 全局检查并为所有垂直排列的 `<Text>` 添加 `block` 类，统一跨端表现 |
| 14 | **统一 ESLint 规则增强** | 增加 `@typescript-eslint/no-explicit-any` 警告规则，逐步减少 `any` |

## P3 — 长期演进

| # | 优化项 | 说明 |
|---|---|---|
| 15 | **E2E 测试** | 引入 Taro CI 自动化测试流程 |
| 16 | **性能优化** | 对长列表（游戏列表、对局历史）引入虚拟滚动；首页数据预加载 |
| 17 | **国际化** | 如果有海外用户需求，引入 i18n 方案 |
| 18 | **CI/CD** | 配置 GitHub Actions 自动化构建、lint、typecheck、部署 |

---

## 已知问题汇总

### 后端

- 双 `AuthModule` 并存（`src/modules/auth/` 和 `src/auth/`），职责不清晰
- 已安装 `drizzle-orm` + `drizzle-kit` + `drizzle-zod`，实际全部用 `getSupabaseClient()` 直连，ORM 未使用
- Service 层大量 `any` 类型，缺乏 DTO 验证
- CORS 配置开发环境 `origin: true` 允许所有来源，生产环境硬编码假域名

### 前端

- Zustand 已引入但全部页面用 `useState` + `Taro.getStorageSync`，无全局 store
- API 响应解包方式不统一（有的取 `res.data.data`，有的取 `res.data?.access_token`）
- `TYPE_META`、`SCENE_META` 等常量在多个文件重复定义
- Profile 页 743 行、Dice 页 431 行，未拆分子组件
- 头像上传逻辑在两个方法中几乎完全复制
- 部分页面使用原生 `<input>` 而非 ui 组件库
- H5 端 fixed 布局、CSS 注入等存在兼容性隐患
- 防抖实现不完整（`setTimeout` 内部为空）

### 工程化

- 无任何测试文件，无测试框架依赖
- 无全局网络错误处理拦截器
- `tsconfig.json` 中 `noImplicitAny: false`
- 缺少 `.env.example` 环境变量模板
