# 桌游规则多格式支持 — 实现计划

## 概述

为桌游助手小程序增加多格式规则支持，在现有 Markdown 规则基础上，新增**图片**和 **PDF 自动转图片**两种规则格式。每条规则有独立标题，桌游详情页以折叠面板展示所有规则，默认收起。配套完善管理后台的规则管理界面。

## 技术方案

| 维度 | 选择 | 理由 |
|------|------|------|
| 规则存储 | 新建 `game_rules` 独立表（vs 塞入 board_games 字段） | 一对多关联，支持多条规则；不破坏现有 `board_games.rules` 字段兼容性 |
| PDF 转图片 | `poppler-utils/pdftoppm` 命令行工具 | ✅ 已安装就绪，C++ 实现稳定高效，图片质量与 Adobe 一致 |
| 图片存储 | 复用现有 UploadController + S3 对象存储 | 项目已有完整上传链路，无需额外依赖 |
| 前端展示 | Accordion 组件（`@/components/ui/accordion`） | 项目已有该组件，天然支持折叠/展开 |
| 管理端 | 在现有 games-admin 表单中追加「规则管理」区域 | 保持管理后台统一入口，不另建页面 |

## 功能模块

### 1. 数据库 — `game_rules` 表

新建独立表，与 `board_games` 一对多关联：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL | 主键 |
| game_id | BIGINT | 关联 board_games.id，NOT NULL |
| title | VARCHAR(128) | 规则标题，如「游戏准备」「计分规则」 |
| rule_type | VARCHAR(16) | `markdown` / `images`（PDF 转图后也归为 images） |
| content | TEXT | Markdown 内容（仅 rule_type=markdown 时填写） |
| image_urls | JSONB | 图片 URL 数组（仅 rule_type=images 时填写，直接上传或 PDF 转换） |
| sort_order | INTEGER | 排序权重，默认 0 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

### 2. 后端接口

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/games/:id/rules` | 公开 | 获取某桌游的所有规则（按 sort_order 排序） |
| POST | `/api/games/:id/rules` | admin | 新增一条规则 |
| PUT | `/api/games/rules/:id` | admin | 编辑一条规则 |
| DELETE | `/api/games/rules/:id` | admin | 删除一条规则 |
| POST | `/api/games/rules/upload-pdf` | admin | 上传 PDF，后端转图片后返回图片 URL 数组 |

**PDF 上传流程**：
```
上传 PDF → multer 接收 → 写入 /tmp → pdftoppm -png -r 200 拆页
→ 每张 PNG 上传 S3 → 删除临时文件 → 返回 { imageUrls: [...] }
前端保存规则时直接将 imageUrls 写入 image_urls 字段，原始 PDF 不保留
```

### 3. 前端 — 规则详情页（rule-detail）

- **现有 `board_games.rules` 字段**：保持兼容，若存在且无 `game_rules` 数据时回退展示
- **新 `game_rules` 数据**：使用 Accordion 组件展示，每个 `AccordionItem` 对应一条规则
- **根据 rule_type 渲染不同内容**：
  - `markdown` → RichText（复用现有 `markdownToRichText`）
  - `images` → 横向滑动图片画廊（左右滑动/双指缩放，直接上传或 PDF 转换来源共用同一展示逻辑）
- **默认收起**：Accordion 的 `defaultValue` 为空数组，所有规则折叠

### 4. 前端 — 桌游管理页（games-admin）

在现有表单的「规则」区域（目前只有一个 MarkdownEditor），改为「规则管理」区块：

- **规则列表**：展示已有规则的标题 + 类型标签（Markdown/图片）+ 排序手柄 + 删除按钮
- **添加规则按钮**：打开规则编辑器
- **规则编辑器**：
  - 标题输入框
  - 类型选择器（两 Tab: Markdown / 图片）；Markdown 类型显示 MarkdownEditor，图片类型显示图片上传区域
  - **图片上传支持两种源**：
    - **直接上传图片**：多图选择 → 调 uploadFile 逐个上传 → 存入 image_urls
    - **PDF 转图片**（推荐多页规则）：选择 PDF → 调 `upload-pdf` 接口 → 后端转图后返回 URL 数组 → 自动填入 image_urls
- **保存规则**：调用 POST/PUT 接口

## 是否有原型设计

否（功能增强，非首次开发，跳过原型设计）

## 实施步骤

1. **数据库迁移** — 创建 `game_rules` 表（SQL 脚本 + 更新 Drizzle schema.ts）
2. **后端接口开发** — 实现 GameRulesService/Controller（CRUD + PDF 上传转图片）→ API 测试 + 前后端匹配验证
3. **前端管理端改造** — games-admin 页面新增规则管理 UI（规则列表 + 规则编辑器支持三种类型）
4. **前端详情页改造** — rule-detail 页面接入 `game_rules` 数据，用 Accordion 展示多规则
5. **执行 `pnpm validate`** — TypeScript + ESLint 校验，修复所有 error
6. **编译检查与验证** — 构建 + 日志健康检查

## 页面规格

### 全局导航

##### @nav(mobile-tabbar)
> type: tabbar
> platform: mobile

- @page(/) 首页 | icon: House
- @page(/games) 桌游馆 | icon: ChessKing
- @page(/tools) 工具箱 | icon: Toolbox
- @page(/history) 对局 | icon: History
- @page(/profile) 我的 | icon: User

### 页面详情

##### @page(/rule-detail) 规则详情

**核心职责**：展示桌游的完整信息（封面、简介）+ 多条规则（折叠/展开）
**访问路径**：桌游馆 @page(/games) 点击桌游卡片进入，传参 `?id=game_id`
**布局**：顶部 Hero 封面区 → 简介卡片 → 规则列表（多 Accordion 项）→ 贴士 → 攻略列表 → 底部操作栏

**规则区块展示**

| 区域 | 内容 | 交互 |
|------|------|------|
| 规则列表 | Accordion 容器，每项 = title + type badge | 全部默认收起，点击展开 |
| 规则项(Markdown) | AccordionTrigger(标题+标签) + AccordionContent(RichText) | 展开后渲染 Markdown |
| 规则项(图片) | AccordionTrigger(标题+标签) + AccordionContent(图片画廊-横向滚动) | 图片可左右滑动/缩放（来源：直接上传或 PDF 转换） |

**状态**：
- 空态：无规则时隐藏规则区块
- 加载态：Skeleton 占位

**交互说明**

| 元素 | 动作 | 响应 | 传参 | 备注 |
|------|------|------|------|------|
| 规则标题栏 | 点击 | 展开/收起对应的规则内容 | — | Accordion 原生交互 |
| 规则中图片 | 点击 | 图片预览（放大查看） | — | Taro.previewImage |

##### @page(/games-admin) 桌游管理

**核心职责**：管理员添加/编辑/删除桌游，管理桌游的规则（多格式）
**访问路径**：我的 @page(/profile) → 管理入口，或直接访问
**布局**：顶部搜索+筛选 → 桌游列表 → 编辑弹窗（含规则管理区域）

**新增规则编辑器（在编辑弹窗内）**：

| 区域 | 内容 | 交互 |
|------|------|------|
| 规则列表 | 已有规则卡片（标题+类型标签+排序+删除） | 点击编辑、拖动排序、删除 |
| 添加规则按钮 | "+ 添加规则" | 弹出规则编辑表单 |
| 规则类型选择 | 内置切换：Markdown 编辑区 / 图片上传区 | 切换后展示对应编辑器 |
| Markdown 编辑器 | MarkdownEditor 组件 | 输入 Markdown 文本 |
| 图片上传 | 多图选择 + 上传 + 预览 + 可删除 | 调用 uploadFile，成功后展示缩略图 |
| PDF 转图片（上传区子功能） | 选择 PDF → 上传 → 显示转换进度 → 自动填入图片列表 | 调用 upload-pdf 接口，结果追加到 image_urls |

**交互说明**

| 元素 | 动作 | 响应 | 传参 | 备注 |
|------|------|------|------|------|
| 添加规则 | 点击 | 展开规则编辑器 | — | 表单内 |
| 保存规则 | 点击 | 调用 API 保存，刷新规则列表 | title, rule_type, content/images/image_urls | — |
| 删除规则 | 点击 | 确认弹窗 → 删除并刷新 | rule_id | — |
| PDF 转图片 | 选择 PDF | 显示进度 → 上传 → 转换 → 自动追加到图片列表 | file(.pdf) | 上传区子功能，转换后的图片与其他图片统一管理 |
| 图片上传 | 选择图片 | 上传 → 缩略图预览 | file(s) | 支持多选 |