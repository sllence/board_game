# 桌游引擎化平台 设计文档

**日期：** 2026-06-09
**状态：** 待实现
**关联：** 桌游助手（Board Game Buddy）— 大批量桌游添加支持

---

## 1. 概述

### 1.1 背景

当前架构在 `board_games` 表上仅以一个 `scoring_config` jsonb 表达差异，无法承载：

- 不同的**道具**（角色卡、资源、板块、筹码）
- 不同的**流程**（昼夜阶段、拍卖轮次、回合制）
- 不同的**工具**白名单与绑定
- 不同的**对局页布局**（按桌游切换 UI）
- 不同的**计分方式**（阵营胜负、多维计分、终局判定）

新增任意一款桌游都需要改前端代码、对局领航页 876 行单体硬编码；admin 后台无法表达新维度。

### 1.2 目标

构建一个**桌游引擎化平台**：

- 后端**无游戏业务知识**，仅做 schema 校验 + 事件流 + 状态快照持久化
- 前端提供**内置引擎库**（5 个引擎），每个引擎自带 Zod schema、reducer、UI 组件
- Admin 后台**动态生成表单**（同一份 Zod schema 驱动校验、表单、AI 拼装）
- 加新桌游 = **后台填表**（多数情况无需发版）；加新引擎 = 写代码（少有情况）

### 1.3 非目标

- 不做在线对战/同步（仍为线下对局辅助）
- 不做桌游导入 CSV / 第三方市场（MVP 后）
- 不做引擎动态远程加载（仓库内置）
- 不重写已存在的老 v1 接口与页面（冷启动，新表 + 新页面）

---

## 2. 架构总览

### 2.1 三层抽象

```
┌─────────────────────────────────────────────────────────────┐
│  Admin Layer     后台动态表单（Zod 反射 + react-hook-form）  │
├─────────────────────────────────────────────────────────────┤
│  Engine Layer    src/games/engines/ 仓库内置 5 个引擎       │
│                  每个引擎 = Zod schema + reducer + React 组件│
├─────────────────────────────────────────────────────────────┤
│  Storage Layer   后端只负责：                                │
│                  - 通用 event log 写入（任意 payload）       │
│                  - state blob 定期覆盖                       │
│                  - 通用 CRUD（不持有任何游戏知识）            │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 关键不变量

1. **后端不持有任何游戏业务知识**——不知道 phase 是什么、不知道 vote 是什么
2. **客户端是所有游戏逻辑的 source of truth**——断线重连 = 拉快照 + 应用事件差量
3. **Schema 是单一 source of truth**——Zod schema 驱动客户端 reducer、后端校验、Admin 表单生成、AI prompt 拼装
4. **Engine 是一等公民**——可被选中、可 extras 挂载、可在 admin 后台配置

### 2.3 数据流

```
GamePage (用户交互)
   ↓ dispatch(action)
useGameEngine reducer
   ↓ canEmit 预检 + reducer 计算
新 state + Action
   ↓
   ├─ 本地立即更新
   ├─ POST /api/sessions/:id/events   (事件流)
   └─ 节流 PUT /api/sessions/:id/state (快照)
```

---

## 3. 数据库 Schema

冷启动策略：老表 `board_games` / `game_sessions` 保留不删；新建 v2 表独立工作。

### 3.1 表清单

| 表名 | 用途 |
|---|---|
| `board_games_v2` | 桌游元数据 + engine 路由 + 模块配置 |
| `game_session_events` | 事件流（append-only） |
| `game_session_states` | 状态快照（定期覆盖） |

### 3.2 `board_games_v2`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | serial PK | |
| `slug` | varchar(64) UNIQUE | 内部唯一标识 |
| `name` | varchar(64) | 显示名 |
| `cover_image_url` | varchar(512) | 封面图 TOS URL |
| `cover_bg` | varchar(64) | 封面渐变 |
| `icon_key` | varchar(32) | 图标 key |
| `icon_bg` | varchar(64) | 图标底色 |
| `icon_color` | varchar(16) | 图标前景色 |
| `type` | text[] | 类型标签 |
| `scene` | text[] | 场景标签 |
| `min_players` | int | 最少人数 |
| `max_players` | int | 最多人数 |
| `min_duration` | int | 最短时长(分钟) |
| `max_duration` | int | 最长时长(分钟) |
| `difficulty` | varchar(16) | 难度 easy/medium/hard |
| `intro` | text | 简介 |
| `tips` | text[] | 新手技巧 |
| `rules_md` | text | 规则 markdown（喂 AI） |
| **`primary_engine`** | varchar(32) | 主引擎 enum |
| **`extras`** | jsonb | `[{engine, config}]` 辅助引擎数组 |
| **`engine_config`** | jsonb | 主引擎私有配置（由该引擎 Zod 决定） |
| **`enabled_modules`** | text[] | 启用的 module：`props/flow/scoring/tools/layout` |
| **`props`** | jsonb | 道具清单（由 props Zod 决定） |
| **`flow`** | jsonb | 阶段/触发配置（由 flow Zod 决定） |
| **`scoring`** | jsonb | 计分配置（由 scoring Zod 决定） |
| **`tools`** | jsonb | 工具白名单（由 tools Zod 决定） |
| **`layout`** | jsonb | 布局配置（由 layout Zod 决定） |
| `sort_order` | int | 排序权重 |
| `status` | varchar(16) | online/preview/offline |
| `version` | int | 配置版本号（编辑 +1） |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**关键决策**：把 5 个 module 拆成独立列（而不是塞进一个 jsonb）——便于单模块编辑、单 schema 校验、单独建索引。

**primary_engine 枚举**：

```
social-deduction | card-duel | engine-builder | race-score | freeform
```

### 3.3 `game_session_events`（append-only）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | bigserial PK | |
| `session_id` | int FK | |
| `seq` | int | session 内自增序号 |
| `engine_type` | varchar(32) | 哪个引擎产生 |
| `event_type` | varchar(64) | 引擎内自由定义 |
| `payload` | jsonb | 引擎自由定义（后端不校验） |
| `actor_player_id` | int? | 发起玩家 |
| `ts` | timestamp | 服务端时间 |

索引：`(session_id, seq)` 复合唯一 + 升序。

### 3.4 `game_session_states`

| 字段 | 类型 | 说明 |
|---|---|---|
| `session_id` | int PK FK | 一对一 |
| `engine_type` | varchar(32) | |
| `state` | jsonb | 引擎 reducer 输出的完整 state |
| `last_event_seq` | int | 对应 events 表最后一个被应用的事件序号 |
| `updated_at` | timestamp | |

---

## 4. 前端 Engine Registry

### 4.1 目录结构

```
src/games/
├── registry.ts                    # 引擎注册中心（运行时单例）
├── core/
│   ├── EngineContext.tsx          # React Context：当前 engine + session + dispatch
│   ├── PhaseController.tsx        # 主引擎 + extras 统一调度
│   ├── useGameEngine.ts           # 客户端 useReducer 封装
│   ├── DynamicForm.tsx            # 通用表单渲染（Zod 反射）
│   ├── usePersistence.ts          # 事件/快照同步 hook
│   └── types.ts                   # Engine / Module / Action 接口
├── engines/
│   ├── freeform/
│   │   ├── index.ts
│   │   ├── schema.ts              # Zod schema
│   │   ├── reducer.ts             # 客户端 reducer
│   │   ├── components/
│   │   │   ├── FreeformPage.tsx
│   │   │   └── FreeformSetup.tsx
│   │   └── README.md
│   └── race-score/
│       └── ... (同上)
```

### 4.2 Engine 接口

```typescript
type EngineType =
  | 'social-deduction'
  | 'card-duel'
  | 'engine-builder'
  | 'race-score'
  | 'freeform'

interface EngineModule {
  type: EngineType
  displayName: string
  defaultConfig: unknown

  // 单一 source of truth
  configSchema: ZodSchema                    // engine_config
  eventSchemas: Record<string, ZodSchema>    // event_type → payload
  scoringSchema?: ZodSchema
  propsSchema?: ZodSchema
  flowSchema?: ZodSchema
  toolsSchema?: ZodSchema
  layoutSchema?: ZodSchema

  // 客户端运行
  initialState(config: unknown, players: Player[]): unknown
  reducer(state: unknown, action: Action): unknown
  canEmit(state: unknown, action: Action): boolean

  // AI 拼装
  buildPrompt(game: BoardGame, question: string, context?: unknown): string

  // UI
  GamePage: React.FC<EngineUIProps>
  SetupPage: React.FC<EngineSetupProps>
}

interface EngineRegistry {
  register(module: EngineModule): void
  get(type: EngineType): EngineModule | undefined
  list(): EngineModule[]
}
```

### 4.3 PhaseController

主引擎 + extras 引擎的统一调度器：

```tsx
<PhaseController primary={game.primary_engine} extras={game.extras}>
  {(state, dispatch) => (
    <PrimaryEngine.GamePage state={state} dispatch={dispatch} />
  )}
</PhaseController>
```

- 主引擎暴露 `phase`（如 social-deduction 的 `day` / `night` / `vote`）
- extras 引擎通过 `onPhaseEnter` / `onPhaseExit` 钩子接入
- 状态机切换由主引擎 reducer 决定；extras 只能响应

### 4.4 持久化

`core/usePersistence.ts`：

- 事件：每次 dispatch 成功立即 `POST /api/sessions/:id/events`
- 快照：节流 5s 或 30s 一次整体 `PUT /api/sessions/:id/state`（不差量）
- 重连：拉最新 snapshot + 序号之后 events → 客户端 reducer 顺序 replay

---

## 5. Admin 后台

### 5.1 路径

新页面：`src/pages/games-admin-v2/index.tsx`（v1 后台保留不动）。

### 5.2 流程

```
Step 1: 选主引擎 + extras
   ○ 社交推理  ○ 牌类  ○ 建设  ○ 竞速  ○ 自由
   Extras: ☐ 牌类  ☐ 竞速  ...

Step 2: 启用 modules
   ☑ 道具  ☑ 流程  ☑ 计分  ☐ 工具  ☑ 布局

Step 3: 编辑各 module（动态表单）
   ┌──────── props (Zod 反射) ────────┐
   │ 道具名 [____] 数量 [__] 图标 [▼] │
   │ [+ 添加道具]                    │
   └────────────────────────────────┘
   ... flow / scoring / tools / layout

Step 4: 基础信息（name/cover/type/scene/...）
              [保存]  [取消]
```

### 5.3 DynamicForm

`core/DynamicForm.tsx` 接 Zod schema 反射生成控件：

| Zod 类型 | 渲染 |
|---|---|
| `ZodString` | Input |
| `ZodEnum` | Select |
| `ZodNumber` | 数字 Input |
| `ZodArray` | 列表 + [+ 添加] |
| `ZodObject` | 嵌套折叠 |
| `ZodOptional` | 同内层 + 复选框启用 |
| 自定义 `z.brand` | 引擎可覆盖 |

主引擎的 `SetupPage` 可覆盖默认渲染（如 `card-duel` 引擎有牌组可视化编辑器）。

### 5.4 引擎元信息端点

`GET /api/engines` — 列出所有已实现引擎（type + displayName + version）
`GET /api/engines/:type` — 引擎元信息 + 默认 config 形状（不含 schema）

**注**：引擎的 Zod schema **仅供前端使用**（驱动 reducer、DynamicForm、buildPrompt）。后端不需要 Zod schema 本身——它只接收/返回已序列化好的 config JSON，并对**整个 board_games_v2 行**做 Zod 校验（顶层结构固定：`primary_engine` 是 enum，`extras` 是数组等）。引擎内部 config 字段在入库前由前端 Zod 校验通过；后端只做"已校验后"的存储。

未来若要做"纯后端侧 prompt 拼装"等服务端能力（§6 提到），再单独设计引擎 schema 上传机制（MVP 不做）。

---

## 6. AI 规则问答适配

`POST /api/ai/chat` 新增 `engine` 参数：

```typescript
async function handleAIChat(boardGameId: number, question: string) {
  const game = await getGame(boardGameId)
  const engineType = game.primary_engine
  // 后端零业务：只做字段透传，prompt 拼装在客户端进行
  // 调用前需先让前端把 game.rules_md 拼好发上来（或在请求里发 prompt）
  const { context, promptTemplate } = request.body
  // 后端只负责调用 LLM 客户端
  return await callLLM(complete(promptTemplate, context))
}
```

**实际流程**：

1. 客户端拿到 game 数据后调用 `engine.buildPrompt(game, question)` 生成完整 prompt 字符串
2. 客户端 `POST /api/ai/chat { game_id, prompt }`——后端只透传给 LLM，不做游戏知识处理
3. 未来若要服务端拼 prompt，引擎 schema 也注册到后端（届时用 zod-to-json-schema 反向生成）

每个引擎的 `buildPrompt`：

- `race-score`: scoring rules + 道具说明
- `social-deduction`: 角色表 + 阶段说明 + 阵营胜负
- `freeform`: 全部 rules

---

## 7. 5 个引擎（内置仓库组件）

| Engine | 适配游戏 | 关键能力 |
|---|---|---|
| `race-score` | 大部分通用、剧本杀、卡牌竞速 | 计分项配置、轮次追踪、自动终局 |
| `freeform` | 故事向、开放桌游 | 只用通用计分 + 计时 + 工具 |
| `social-deduction` | 狼人杀、阿瓦隆、三国杀 | 角色揭示、昼夜/任务阶段、投票、阵营胜负 |
| `card-duel` | UNO、扑克 | 牌堆管理、合法出牌判定、特殊效果 |
| `engine-builder` | 卡坦岛、璀璨宝石、七大奇迹、农场主 | 资源池、行动选项、卡牌/板块库、多维计分 |

**MVP 范围**：只实现 `race-score` + `freeform`。其余 3 个引擎后置。

---

## 8. API 端点（v2）

| Method | Path | 说明 |
|---|---|---|
| GET | `/api/engines` | 列出所有已注册引擎 |
| GET | `/api/engines/:type/schema` | 引擎 schema + 默认 config |
| GET | `/api/games-v2` | 桌游列表（v2） |
| GET | `/api/games-v2/:id` | 桌游详情 |
| POST | `/api/games-v2` | 创建桌游 |
| PUT | `/api/games-v2/:id` | 更新桌游 |
| DELETE | `/api/games-v2/:id` | 软删（status=offline） |
| POST | `/api/sessions-v2` | 创建对局 |
| GET | `/api/sessions-v2/:id` | 对局详情（含 game + latest state） |
| POST | `/api/sessions-v2/:id/events` | 追加事件 |
| GET | `/api/sessions-v2/:id/events?since_seq=N` | 拉取事件增量 |
| PUT | `/api/sessions-v2/:id/state` | 覆盖状态快照 |
| POST | `/api/sessions-v2/:id/finish` | 结束对局 |
| POST | `/api/ai/chat` | AI 问答（v2：含 engine 参数） |

所有端点统一走 TransformInterceptor（`{code, data, message}` 信封）。

---

## 9. 错误处理

| 场景 | 行为 |
|---|---|
| 客户端 reducer 抛错 | 阻止 dispatch + 红色 toast（不写事件） |
| 客户端 `canEmit` 失败 | 同上 |
| 事件 POST 失败 | 标记为 pending 事件，本地保留，重连时按 seq 重发 |
| 快照 PUT 失败 | 下次节流覆盖再试；不致命 |
| 重连发现冲突（state vs events） | 客户端记录 last_event_seq，service 端以 state 为准，丢弃序号小于等于 last_event_seq 的未消费事件 |
| 后端 schema 校验失败（Zod） | 400 + 字段级 error 列表 |
| AI 问答失败 | 返回空 answer + 提示重试 |

---

## 10. 测试策略

| 层级 | 工具 | 覆盖 |
|---|---|---|
| Engine reducer | Vitest | 每个引擎至少 5 个 case（init、合法 action、非法 action、终局、并发） |
| Engine schema | Vitest | 校验合法/非法 config 至少各 3 例 |
| Zod → JSON Schema | Vitest | 每个引擎导出后能反序列化 |
| 后端 controller | Supertest | CRUD + events + state 主要路径 |
| e2e | miniprogram-automator 或 H5 Playwright | 建桌游→开对局→记分→结束→重连 |

**MVP 关键 e2e**：admin v2 创建 race-score 桌游 → 用户开对局 → 多人加 → 3 类事件 → 杀进程重启 → 状态恢复 → AI 问答。

---

## 11. MVP 验收

- [ ] 用 admin v2 创建 race-score 桌游，填道具/计分/流程
- [ ] 用户从 v2 对局页开启对局
- [ ] 多人加入，按 phase 推进，发生至少 3 类事件
- [ ] 关闭小程序再打开，从最近事件序号重放恢复
- [ ] AI 问答能基于该桌游的 rules 给出合理答案
- [ ] 编辑 engine_config 后再开对局，行为符合新配置
- [ ] `pnpm validate` 通过
- [ ] e2e 通过

## 12. 后续 Roadmap（MVP 之后）

| 阶段 | 内容 |
|---|---|
| 0.5 | 迁移老 8 款桌游到 v2（手填） |
| 1.0 | social-deduction 引擎（狼人杀/阿瓦隆/三国杀） |
| 1.5 | engine-builder 引擎（卡坦岛/璀璨宝石） |
| 2.0 | card-duel 引擎（UNO/扑克） |
| 2.5 | 向量检索 + AI 升级 |
| 3.0 | 第三方桌游导入（CSV/JSON） |

---

## 13. 关键文件清单（实施时参考）

### 后端

```
server/src/
├── modules/
│   ├── games-v2/                  # 新模块
│   │   ├── games-v2.controller.ts
│   │   ├── games-v2.service.ts
│   │   ├── games-v2.module.ts
│   │   └── games-v2.dto.ts        # Zod schemas
│   ├── sessions-v2/               # 新模块
│   │   └── ...
│   ├── engines/                   # 新模块
│   │   ├── engines.controller.ts  # /api/engines
│   │   ├── engines.service.ts
│   │   └── engine-registry.ts     # 后端 registry（接收前端 Zod 编译产物）
│   └── ai/                        # 改：AI 问答走新 prompt
└── ...
```

### 前端

```
src/games/
├── registry.ts
├── core/...
├── engines/
│   ├── freeform/
│   └── race-score/

src/pages/
├── games-admin-v2/    # 新 admin 页面
│   ├── index.tsx
│   ├── components/
│   │   ├── EnginePicker.tsx
│   │   ├── ModuleEditor.tsx
│   │   └── DynamicFormRenderer.tsx
│   └── index.config.ts
├── session-v2/        # 新对局页
│   ├── index.tsx
│   └── index.config.ts
```

### API 接入

```
src/api/                         # 新模块
├── games-v2.ts
├── sessions-v2.ts
└── engines.ts
```

---

## 14. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 引擎 API 演进破坏老调用 | 引擎有 `version` 字段；后端校验不匹配时拒绝加载 |
| 后端 schema 上传不完整 | 引擎启动自检：必填 schema 缺失则 console.error 并禁用 |
| 客户端 reducer 越写越大 | 单引擎 reducer ≤ 500 行；超过则拆 sub-reducer |
| 事件流膨胀 | 后端定期归档 7 天前 events 到 `game_session_events_archive` |
| 快照 PUT 抖动 | 防抖 5s + visibilitychange 强制刷 |
| 后端零业务知识但 AI 仍要拼 prompt | 后端只做"把 game + engine 字段原样转给引擎 buildPrompt 钩子"；拼装逻辑在客户端引擎代码里 |

---

## 15. 决策记录

| # | 决策 | 备选 | 理由 |
|---|---|---|---|
| 1 | 完整引擎库（5 个） | 1+5 schema 简化 | 用户接受 1.5x 工作量换灵活度 |
| 2 | 引擎内置仓库 | 远程 npm 包 | 加新引擎需发版即可；不需动态加载 |
| 3 | 主引擎 + extras | 完全平等多引擎 | 三国杀=social-deduction+card-duel 必需 |
| 4 | 后端只做 schema 校验 | 引擎服务接口 | 减少后端业务代码；客户端即 source of truth |
| 5 | 事件流 + 状态快照 | 仅快照 | 快照丢失时无法增量恢复 |
| 6 | per-engine 事件 payload | 后端强校验事件 | 引擎独立；后端零业务 |
| 7 | 快照 jsonb blob + 定期覆盖 | 不存快照 / 只存终局 | 重连体验最好；成本可接受 |
| 8 | 冷启动 v2 表 | 迁移 / 双轨 | 老数据保留可参考；新表独立 |
| 9 | 引擎感知 AI | 全量规则 | 节省 token；prompt 更精准 |
| 10 | react-hook-form + Zod | @rjsf/core | 与项目已有 Zod 一致；可控 |
| 11 | MVP = race-score + freeform | 一次性 5 引擎 | 起步验证骨架；后续补全 |
| 12 | 后端骨架先行 | 垂直切片 | 验证 API 与 schema 后前端并行 |
