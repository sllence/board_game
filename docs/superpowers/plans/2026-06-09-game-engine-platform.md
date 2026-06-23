# 桌游引擎化平台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在桌游助手上构建桌游引擎化平台，支持通过 Admin 后台无代码添加新桌游，每个桌游有自己的道具/流程/计分/工具/布局。

**Architecture:** 后端零业务（仅 schema 校验 + 事件流 + 状态快照）；前端 5 个内置引擎（仓库组件）每个带 Zod schema + reducer + React 组件；Admin 后台用 Zod 反射生成动态表单；MVP 实现 race-score + freeform 两个示范引擎。

**Tech Stack:** Taro 4 + React 18 + TypeScript, NestJS 10 + Drizzle ORM + Supabase + Zod 4, zustand 状态管理

**Spec:** `docs/superpowers/specs/2026-06-09-game-engine-platform-design.md`

---

## 文件清单

### 后端新建

| 操作 | 文件 | 职责 |
|---|---|---|
| 新建 | `server/src/storage/database/004_create_game_engine_v2.sql` | DDL: board_games_v2 / game_session_events / game_session_states |
| 新建 | `server/src/storage/database/shared/schema-v2.ts` | Drizzle 三个新表的 schema |
| 新建 | `server/src/modules/games-v2/games-v2.module.ts` | NestJS 模块 |
| 新建 | `server/src/modules/games-v2/games-v2.controller.ts` | CRUD + 软删 |
| 新建 | `server/src/modules/games-v2/games-v2.service.ts` | Supabase 调用层 |
| 新建 | `server/src/modules/games-v2/games-v2.dto.ts` | 顶层 Zod schema |
| 新建 | `server/src/modules/sessions-v2/sessions-v2.module.ts` | 模块 |
| 新建 | `server/src/modules/sessions-v2/sessions-v2.controller.ts` | sessions/events/states 路由 |
| 新建 | `server/src/modules/sessions-v2/sessions-v2.service.ts` | 业务 |
| 新建 | `server/src/modules/engines/engines.module.ts` | 引擎元信息模块 |
| 新建 | `server/src/modules/engines/engines.controller.ts` | /api/engines |
| 新建 | `server/src/modules/engines/engines.service.ts` | 引擎列表（硬编码 enum + version） |
| 修改 | `server/src/app.module.ts` | 注册三个新模块 |

### 前端新建

| 操作 | 文件 | 职责 |
|---|---|---|
| 新建 | `src/games/registry.ts` | 引擎注册中心（单例） |
| 新建 | `src/games/core/types.ts` | Engine / EngineModule / Action 接口 |
| 新建 | `src/games/core/PhaseController.tsx` | 主引擎 + extras 调度 |
| 新建 | `src/games/core/useGameEngine.ts` | useReducer 封装 |
| 新建 | `src/games/core/DynamicForm.tsx` | Zod 反射表单 |
| 新建 | `src/games/core/usePersistence.ts` | 事件/快照同步 |
| 新建 | `src/games/engines/freeform/index.ts` | 入口 |
| 新建 | `src/games/engines/freeform/schema.ts` | Zod schema |
| 新建 | `src/games/engines/freeform/reducer.ts` | reducer |
| 新建 | `src/games/engines/freeform/components/FreeformPage.tsx` | 主对局 UI |
| 新建 | `src/games/engines/race-score/index.ts` | 入口 |
| 新建 | `src/games/engines/race-score/schema.ts` | Zod schema |
| 新建 | `src/games/engines/race-score/reducer.ts` | reducer |
| 新建 | `src/games/engines/race-score/components/RaceScorePage.tsx` | 主对局 UI |
| 新建 | `src/games/engines/index.ts` | 全量注册（自启动） |
| 新建 | `src/api/games-v2.ts` | games-v2 接口 |
| 新建 | `src/api/sessions-v2.ts` | sessions-v2 接口 |
| 新建 | `src/api/engines.ts` | engines 接口 |
| 新建 | `src/pages/games-admin-v2/index.tsx` | Admin v2 入口 |
| 新建 | `src/pages/games-admin-v2/index.config.ts` | 导航栏配置 |
| 新建 | `src/pages/games-admin-v2/components/EnginePicker.tsx` | 选主引擎+extras |
| 新建 | `src/pages/games-admin-v2/components/ModuleEditor.tsx` | 动态编辑各 module |
| 新建 | `src/pages/games-admin-v2/components/DynamicFormRenderer.tsx` | 包装 DynamicForm |
| 新建 | `src/pages/session-v2/index.tsx` | v2 对局页（PhaseController 入口） |
| 新建 | `src/pages/session-v2/index.config.ts` | 导航栏配置 |
| 修改 | `src/app.config.ts` | 注册两个新页面 |

### 测试新建

| 操作 | 文件 | 职责 |
|---|---|---|
| 新建 | `src/games/engines/freeform/__tests__/reducer.test.ts` | freeform reducer 单测 |
| 新建 | `src/games/engines/race-score/__tests__/reducer.test.ts` | race-score reducer 单测 |
| 新建 | `src/games/core/__tests__/DynamicForm.test.tsx` | 动态表单单测 |
| 新建 | `server/src/modules/games-v2/games-v2.controller.spec.ts` | 后端 controller 单测 |

---

## Phase A：DB + 后端骨架（目标：能 curl 调用 v2 CRUD）

### Task 1: 数据库迁移 - 3 张 v2 表

**Files:**
- Create: `server/src/storage/database/004_create_game_engine_v2.sql`

- [ ] **Step 1: 写迁移 SQL**

```sql
-- server/src/storage/database/004_create_game_engine_v2.sql

-- 桌游 v2 表
CREATE TABLE IF NOT EXISTS board_games_v2 (
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(64) NOT NULL,
  cover_image_url VARCHAR(512),
  cover_bg VARCHAR(64),
  icon_key VARCHAR(32),
  icon_bg VARCHAR(64),
  icon_color VARCHAR(16),
  type TEXT[] DEFAULT '{}',
  scene TEXT[] DEFAULT '{}',
  min_players INT NOT NULL DEFAULT 2,
  max_players INT NOT NULL DEFAULT 4,
  min_duration INT,
  max_duration INT,
  difficulty VARCHAR(16) DEFAULT 'medium',
  intro TEXT,
  tips TEXT[] DEFAULT '{}',
  rules_md TEXT,
  primary_engine VARCHAR(32) NOT NULL,
  extras JSONB DEFAULT '[]'::jsonb,
  engine_config JSONB DEFAULT '{}'::jsonb,
  enabled_modules TEXT[] DEFAULT '{}',
  props JSONB DEFAULT '{}'::jsonb,
  flow JSONB DEFAULT '{}'::jsonb,
  scoring JSONB DEFAULT '{}'::jsonb,
  tools JSONB DEFAULT '{}'::jsonb,
  layout JSONB DEFAULT '{}'::jsonb,
  sort_order INT DEFAULT 0,
  status VARCHAR(16) DEFAULT 'online',
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_games_v2_status ON board_games_v2(status);
CREATE INDEX IF NOT EXISTS idx_board_games_v2_primary_engine ON board_games_v2(primary_engine);

-- 事件流
CREATE TABLE IF NOT EXISTS game_session_events (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL,
  seq INT NOT NULL,
  engine_type VARCHAR(32) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_player_id INT,
  ts TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_gse_session_seq ON game_session_events(session_id, seq);
CREATE INDEX IF NOT EXISTS idx_gse_engine_type ON game_session_events(engine_type);

-- 状态快照
CREATE TABLE IF NOT EXISTS game_session_states (
  session_id BIGINT PRIMARY KEY,
  engine_type VARCHAR(32) NOT NULL,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_event_seq INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 2: 提交**

```bash
git add server/src/storage/database/004_create_game_engine_v2.sql
git commit -m "feat(db): 新增 v2 桌游/事件流/状态快照三表迁移"
```

---

### Task 2: Drizzle schema 同步（手动薄封装）

**Files:**
- Create: `server/src/storage/database/shared/schema-v2.ts`

- [ ] **Step 1: 写 Drizzle schema**

```typescript
// server/src/storage/database/shared/schema-v2.ts
import { pgTable, bigserial, varchar, integer, text, timestamp, jsonb, bigint, index, unique } from "drizzle-orm/pg-core"

export const boardGamesV2 = pgTable("board_games_v2", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 64 }).notNull(),
  coverImageUrl: varchar("cover_image_url", { length: 512 }),
  coverBg: varchar("cover_bg", { length: 64 }),
  iconKey: varchar("icon_key", { length: 32 }),
  iconBg: varchar("icon_bg", { length: 64 }),
  iconColor: varchar("icon_color", { length: 16 }),
  type: text("type").array().default([]),
  scene: text("scene").array().default([]),
  minPlayers: integer("min_players").notNull().default(2),
  maxPlayers: integer("max_players").notNull().default(4),
  minDuration: integer("min_duration"),
  maxDuration: integer("max_duration"),
  difficulty: varchar("difficulty", { length: 16 }).default("medium"),
  intro: text("intro"),
  tips: text("tips").array().default([]),
  rulesMd: text("rules_md"),
  primaryEngine: varchar("primary_engine", { length: 32 }).notNull(),
  extras: jsonb("extras").default([]),
  engineConfig: jsonb("engine_config").default({}),
  enabledModules: text("enabled_modules").array().default([]),
  props: jsonb("props").default({}),
  flow: jsonb("flow").default({}),
  scoring: jsonb("scoring").default({}),
  tools: jsonb("tools").default({}),
  layout: jsonb("layout").default({}),
  sortOrder: integer("sort_order").default(0),
  status: varchar("status", { length: 16 }).default("online"),
  version: integer("version").default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
})

export const gameSessionEvents = pgTable("game_session_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  sessionId: bigint("session_id", { mode: "number" }).notNull(),
  seq: integer("seq").notNull(),
  engineType: varchar("engine_type", { length: 32 }).notNull(),
  eventType: varchar("event_type", { length: 64 }).notNull(),
  payload: jsonb("payload").notNull().default({}),
  actorPlayerId: integer("actor_player_id"),
  ts: timestamp("ts", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique("gse_session_seq_uq").on(t.sessionId, t.seq),
  index("gse_engine_type_idx").on(t.engineType),
])

export const gameSessionStates = pgTable("game_session_states", {
  sessionId: bigint("session_id", { mode: "number" }).primaryKey(),
  engineType: varchar("engine_type", { length: 32 }).notNull(),
  state: jsonb("state").notNull().default({}),
  lastEventSeq: integer("last_event_seq").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})
```

- [ ] **Step 2: 提交**

```bash
git add server/src/storage/database/shared/schema-v2.ts
git commit -m "feat(db): 新增 v2 Drizzle schema 映射"
```

---

### Task 3: 后端 games-v2 DTO (顶层 Zod)

**Files:**
- Create: `server/src/modules/games-v2/games-v2.dto.ts`

- [ ] **Step 1: 写 Zod schema**

```typescript
// server/src/modules/games-v2/games-v2.dto.ts
import { z } from 'zod'

export const ENGINE_TYPES = [
  'social-deduction',
  'card-duel',
  'engine-builder',
  'race-score',
  'freeform',
] as const

export const MODULE_NAMES = ['props', 'flow', 'scoring', 'tools', 'layout'] as const

const slugRegex = /^[a-z0-9-]+$/

export const BoardGameV2CreateSchema = z.object({
  slug: z.string().regex(slugRegex, 'slug must be kebab-case'),
  name: z.string().min(1).max(64),
  cover_image_url: z.string().url().optional().nullable(),
  cover_bg: z.string().max(64).optional().nullable(),
  icon_key: z.string().max(32).optional().nullable(),
  icon_bg: z.string().max(64).optional().nullable(),
  icon_color: z.string().max(16).optional().nullable(),
  type: z.array(z.string()).default([]),
  scene: z.array(z.string()).default([]),
  min_players: z.number().int().min(1).default(2),
  max_players: z.number().int().min(1).default(4),
  min_duration: z.number().int().optional().nullable(),
  max_duration: z.number().int().optional().nullable(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  intro: z.string().optional().nullable(),
  tips: z.array(z.string()).default([]),
  rules_md: z.string().optional().nullable(),
  primary_engine: z.enum(ENGINE_TYPES),
  extras: z.array(z.object({
    engine: z.enum(ENGINE_TYPES),
    config: z.record(z.string(), z.unknown()).default({}),
  })).default([]),
  engine_config: z.record(z.string(), z.unknown()).default({}),
  enabled_modules: z.array(z.enum(MODULE_NAMES)).default([]),
  props: z.record(z.string(), z.unknown()).default({}),
  flow: z.record(z.string(), z.unknown()).default({}),
  scoring: z.record(z.string(), z.unknown()).default({}),
  tools: z.record(z.string(), z.unknown()).default({}),
  layout: z.record(z.string(), z.unknown()).default({}),
  sort_order: z.number().int().default(0),
  status: z.enum(['online', 'preview', 'offline']).default('online'),
})

export const BoardGameV2UpdateSchema = BoardGameV2CreateSchema.partial()

export type BoardGameV2Create = z.infer<typeof BoardGameV2CreateSchema>
export type BoardGameV2Update = z.infer<typeof BoardGameV2UpdateSchema>
```

- [ ] **Step 2: 提交**

```bash
git add server/src/modules/games-v2/games-v2.dto.ts
git commit -m "feat(server): 新增 games-v2 顶层 Zod DTO"
```

---

### Task 4: games-v2 service

**Files:**
- Create: `server/src/modules/games-v2/games-v2.service.ts`

- [ ] **Step 1: 写 service**

```typescript
// server/src/modules/games-v2/games-v2.service.ts
import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'
import type { BoardGameV2Create, BoardGameV2Update } from './games-v2.dto'

@Injectable()
export class GamesV2Service {
  async findAll(filters: { status?: string; primary_engine?: string }) {
    const client = getSupabaseClient()
    let q = client
      .from('board_games_v2')
      .select('id, slug, name, type, scene, min_players, max_players, difficulty, primary_engine, status, sort_order, version, cover_image_url, icon_key, icon_bg, icon_color, enabled_modules')
      .order('sort_order', { ascending: true })
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.primary_engine) q = q.eq('primary_engine', filters.primary_engine)
    const { data, error } = await q
    if (error) throw new Error(`查询 v2 桌游列表失败: ${error.message}`)
    return { data }
  }

  async findOne(id: number) {
    const client = getSupabaseClient()
    const { data, error } = await client.from('board_games_v2').select('*').eq('id', id).maybeSingle()
    if (error) throw new Error(`查询 v2 桌游详情失败: ${error.message}`)
    return { data }
  }

  async create(payload: BoardGameV2Create & { version?: number }) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('board_games_v2')
      .insert({ ...payload, version: payload.version ?? 1 })
      .select()
      .single()
    if (error) throw new Error(`创建 v2 桌游失败: ${error.message}`)
    return { data }
  }

  async update(id: number, payload: BoardGameV2Update) {
    const client = getSupabaseClient()
    // 自增 version
    const { data: cur } = await client.from('board_games_v2').select('version').eq('id', id).maybeSingle()
    const nextVersion = (cur?.version ?? 0) + 1
    const { data, error } = await client
      .from('board_games_v2')
      .update({ ...payload, version: nextVersion, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`更新 v2 桌游失败: ${error.message}`)
    return { data }
  }

  async softDelete(id: number) {
    const client = getSupabaseClient()
    const { error } = await client.from('board_games_v2').update({ status: 'offline' }).eq('id', id)
    if (error) throw new Error(`软删 v2 桌游失败: ${error.message}`)
    return { success: true }
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add server/src/modules/games-v2/games-v2.service.ts
git commit -m "feat(server): 新增 games-v2 service"
```

---

### Task 5: games-v2 controller + module

**Files:**
- Create: `server/src/modules/games-v2/games-v2.controller.ts`
- Create: `server/src/modules/games-v2/games-v2.module.ts`

- [ ] **Step 1: 写 controller**

```typescript
// server/src/modules/games-v2/games-v2.controller.ts
import { Controller, Get, Param, Query, Post, Put, Delete, Body } from '@nestjs/common'
import { GamesV2Service } from './games-v2.service'
import { BoardGameV2CreateSchema, BoardGameV2UpdateSchema } from './games-v2.dto'
import { Public, Roles } from '../../auth/decorators'

@Controller('games-v2')
export class GamesV2Controller {
  constructor(private readonly svc: GamesV2Service) {}

  @Get()
  @Public()
  async findAll(@Query() q: { status?: string; primary_engine?: string }) {
    return this.svc.findAll(q)
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string) {
    return this.svc.findOne(Number(id))
  }

  @Post()
  @Roles('admin')
  async create(@Body() body: unknown) {
    const parsed = BoardGameV2CreateSchema.parse(body)
    return this.svc.create(parsed)
  }

  @Put(':id')
  @Roles('admin')
  async update(@Param('id') id: string, @Body() body: unknown) {
    const parsed = BoardGameV2UpdateSchema.parse(body)
    return this.svc.update(Number(id), parsed)
  }

  @Delete(':id')
  @Roles('admin')
  async softDelete(@Param('id') id: string) {
    return this.svc.softDelete(Number(id))
  }
}
```

- [ ] **Step 2: 写 module**

```typescript
// server/src/modules/games-v2/games-v2.module.ts
import { Module } from '@nestjs/common'
import { GamesV2Controller } from './games-v2.controller'
import { GamesV2Service } from './games-v2.service'

@Module({
  controllers: [GamesV2Controller],
  providers: [GamesV2Service],
  exports: [GamesV2Service],
})
export class GamesV2Module {}
```

- [ ] **Step 3: 在 app.module.ts 注册**

在 `server/src/app.module.ts` 顶部 import 处添加：
```typescript
import { GamesV2Module } from '@/modules/games-v2/games-v2.module'
```

在 `imports` 数组添加 `GamesV2Module`。

- [ ] **Step 4: 启动后端 + curl 自测**

```bash
cd server && pnpm dev &  # 启动 dev server
sleep 5
curl -s http://localhost:3000/api/games-v2 | head -100
# 期望: { "data": [], "code": 200, "message": "success" }
```

- [ ] **Step 5: 提交**

```bash
git add server/src/modules/games-v2/ server/src/app.module.ts
git commit -m "feat(server): 新增 games-v2 controller/module 并注册"
```

---

### Task 6: engines 模块（最小元信息）

**Files:**
- Create: `server/src/modules/engines/engines.service.ts`
- Create: `server/src/modules/engines/engines.controller.ts`
- Create: `server/src/modules/engines/engines.module.ts`

- [ ] **Step 1: 写 service（硬编码 5 引擎 + MVP 标记）**

```typescript
// server/src/modules/engines/engines.service.ts
import { Injectable } from '@nestjs/common'

const ENGINES = [
  { type: 'social-deduction', displayName: '社交推理', version: '0.0.0', mvpReady: false },
  { type: 'card-duel',         displayName: '牌类对战', version: '0.0.0', mvpReady: false },
  { type: 'engine-builder',    displayName: '建设经营', version: '0.0.0', mvpReady: false },
  { type: 'race-score',        displayName: '竞速计分', version: '0.1.0', mvpReady: true },
  { type: 'freeform',          displayName: '自由模式', version: '0.1.0', mvpReady: true },
] as const

@Injectable()
export class EnginesService {
  list() { return { data: ENGINES } }
  get(type: string) {
    const e = ENGINES.find(x => x.type === type)
    if (!e) return { data: null }
    return { data: e }
  }
}
```

- [ ] **Step 2: 写 controller**

```typescript
// server/src/modules/engines/engines.controller.ts
import { Controller, Get, Param } from '@nestjs/common'
import { EnginesService } from './engines.service'
import { Public } from '../../auth/decorators'

@Controller('engines')
export class EnginesController {
  constructor(private readonly svc: EnginesService) {}

  @Get()
  @Public()
  async list() { return this.svc.list() }

  @Get(':type')
  @Public()
  async get(@Param('type') type: string) { return this.svc.get(type) }
}
```

- [ ] **Step 3: 写 module 并注册**

```typescript
// server/src/modules/engines/engines.module.ts
import { Module } from '@nestjs/common'
import { EnginesController } from './engines.controller'
import { EnginesService } from './engines.service'

@Module({
  controllers: [EnginesController],
  providers: [EnginesService],
})
export class EnginesModule {}
```

在 `server/src/app.module.ts` 注册（import + imports 数组）。

- [ ] **Step 4: curl 自测**

```bash
curl -s http://localhost:3000/api/engines
# 期望: { "data": [ {"type":"social-deduction",...}, ...5 个 ] }
curl -s http://localhost:3000/api/engines/race-score
# 期望: { "data": { "type": "race-score", "mvpReady": true, ... } }
```

- [ ] **Step 5: 提交**

```bash
git add server/src/modules/engines/ server/src/app.module.ts
git commit -m "feat(server): 新增 engines 模块（硬编码 5 引擎元信息）"
```

---

### Task 7: sessions-v2 service（events + states + sessions）

**Files:**
- Create: `server/src/modules/sessions-v2/sessions-v2.service.ts`

- [ ] **Step 1: 写 service**

```typescript
// server/src/modules/sessions-v2/sessions-v2.service.ts
import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'

@Injectable()
export class SessionsV2Service {
  // 1. 启动 session
  async createSession(body: { user_id?: number; board_game_id: number; session_name?: string; players: any[] }) {
    const client = getSupabaseClient()
    const { data: game, error: gErr } = await client.from('board_games_v2').select('id, primary_engine').eq('id', body.board_game_id).maybeSingle()
    if (gErr || !game) throw new Error('桌游不存在')

    // 先 insert session (复用老表 game_sessions，作为索引)
    const { data: sess, error: sErr } = await client.from('game_sessions').insert({
      user_id: body.user_id ?? null,
      game_id: body.board_game_id,
      session_name: body.session_name ?? null,
      players: body.players,
      status: 'playing',
      started_at: new Date().toISOString(),
    }).select().single()
    if (sErr) throw new Error(`创建对局失败: ${sErr.message}`)

    // 初始化 events seq 起点 = 0 + states
    const { error: stErr } = await client.from('game_session_states').insert({
      session_id: Number(sess.id),
      engine_type: game.primary_engine,
      state: { phase: 'init', players: body.players, round: 0 },
      last_event_seq: 0,
    })
    if (stErr) throw new Error(`初始化状态失败: ${stErr.message}`)

    return { data: { sessionId: Number(sess.id), engineType: game.primary_engine } }
  }

  // 2. 查 session + game + state
  async getSession(sessionId: number) {
    const client = getSupabaseClient()
    const { data: sess, error: sErr } = await client
      .from('game_sessions')
      .select('id, game_id, session_name, players, winner, rounds, duration, status, started_at, finished_at, created_at, game:board_games_v2(id, name, primary_engine, enabled_modules, rules_md, intro, scoring, flow, tools, props, layout, engine_config, version, cover_image_url, cover_bg, icon_key, icon_bg, icon_color)')
      .eq('id', sessionId)
      .maybeSingle()
    if (sErr) throw new Error(`查询对局失败: ${sErr.message}`)

    const { data: st, error: stErr } = await client
      .from('game_session_states')
      .select('state, last_event_seq, engine_type, updated_at')
      .eq('session_id', sessionId)
      .maybeSingle()

    return { data: { ...sess, state: st?.state ?? null, last_event_seq: st?.last_event_seq ?? 0, engine_type: st?.engine_type ?? null, state_updated_at: st?.updated_at ?? null } }
  }

  // 3. 追加事件（seq 自增）
  async appendEvent(sessionId: number, body: { engine_type: string; event_type: string; payload: any; actor_player_id?: number }) {
    const client = getSupabaseClient()
    // 用 RPC 拿下一个 seq
    const { data: maxRow, error: mErr } = await client
      .from('game_session_events')
      .select('seq')
      .eq('session_id', sessionId)
      .order('seq', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (mErr) throw new Error(`查询最大 seq 失败: ${mErr.message}`)
    const nextSeq = (maxRow?.seq ?? 0) + 1

    const { data, error } = await client.from('game_session_events').insert({
      session_id: sessionId,
      seq: nextSeq,
      engine_type: body.engine_type,
      event_type: body.event_type,
      payload: body.payload,
      actor_player_id: body.actor_player_id ?? null,
    }).select().single()
    if (error) throw new Error(`追加事件失败: ${error.message}`)
    return { data: { ...data, seq: nextSeq } }
  }

  // 4. 拉取事件增量
  async getEventsSince(sessionId: number, sinceSeq: number) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('game_session_events')
      .select('*')
      .eq('session_id', sessionId)
      .gt('seq', sinceSeq)
      .order('seq', { ascending: true })
    if (error) throw new Error(`查询事件失败: ${error.message}`)
    return { data: data ?? [] }
  }

  // 5. 覆盖状态快照
  async saveState(sessionId: number, body: { engine_type: string; state: any; last_event_seq: number }) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('game_session_states')
      .upsert({
        session_id: sessionId,
        engine_type: body.engine_type,
        state: body.state,
        last_event_seq: body.last_event_seq,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw new Error(`保存状态失败: ${error.message}`)
    return { data }
  }

  // 6. 结束对局
  async finishSession(sessionId: number, body: { winner?: string; scoring_snapshot: any; duration_seconds: number }) {
    const client = getSupabaseClient()
    const { data, error } = await client.from('game_sessions').update({
      status: 'finished',
      winner: body.winner ?? null,
      scoring_snapshot: body.scoring_snapshot,
      duration: body.duration_seconds,
      finished_at: new Date().toISOString(),
    }).eq('id', sessionId).select().single()
    if (error) throw new Error(`结束对局失败: ${error.message}`)
    return { data }
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add server/src/modules/sessions-v2/sessions-v2.service.ts
git commit -m "feat(server): 新增 sessions-v2 service（events/states/session CRUD）"
```

---

### Task 8: sessions-v2 controller + module + 注册

**Files:**
- Create: `server/src/modules/sessions-v2/sessions-v2.controller.ts`
- Create: `server/src/modules/sessions-v2/sessions-v2.module.ts`
- Modify: `server/src/app.module.ts`

- [ ] **Step 1: 写 controller**

```typescript
// server/src/modules/sessions-v2/sessions-v2.controller.ts
import { Controller, Get, Param, Query, Post, Put, Body } from '@nestjs/common'
import { SessionsV2Service } from './sessions-v2.service'
import { Public } from '../../auth/decorators'

@Controller('sessions-v2')
export class SessionsV2Controller {
  constructor(private readonly svc: SessionsV2Service) {}

  @Post()
  async create(@Body() body: any) {
    return this.svc.createSession(body)
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.svc.getSession(Number(id))
  }

  @Post(':id/events')
  async appendEvent(@Param('id') id: string, @Body() body: any) {
    return this.svc.appendEvent(Number(id), body)
  }

  @Get(':id/events')
  async events(@Param('id') id: string, @Query('since_seq') sinceSeq: string) {
    return this.svc.getEventsSince(Number(id), Number(sinceSeq ?? 0))
  }

  @Put(':id/state')
  async state(@Param('id') id: string, @Body() body: any) {
    return this.svc.saveState(Number(id), body)
  }

  @Post(':id/finish')
  async finish(@Param('id') id: string, @Body() body: any) {
    return this.svc.finishSession(Number(id), body)
  }
}
```

- [ ] **Step 2: 写 module 并注册**

```typescript
// server/src/modules/sessions-v2/sessions-v2.module.ts
import { Module } from '@nestjs/common'
import { SessionsV2Controller } from './sessions-v2.controller'
import { SessionsV2Service } from './sessions-v2.service'

@Module({
  controllers: [SessionsV2Controller],
  providers: [SessionsV2Service],
  exports: [SessionsV2Service],
})
export class SessionsV2Module {}
```

在 `server/src/app.module.ts` 添加 import + 注册。

- [ ] **Step 3: 端到端 curl 自测**

```bash
# 准备一个 board_game_v2
curl -s -X POST http://localhost:3000/api/games-v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin token>" \
  -d '{"slug":"test-mvp","name":"测试桌游","primary_engine":"freeform","enabled_modules":["scoring"]}' | tee /tmp/g.json
GID=$(cat /tmp/g.json | jq -r .data.id)

# 创建对局
curl -s -X POST http://localhost:3000/api/sessions-v2 \
  -H "Content-Type: application/json" \
  -d "{\"board_game_id\":$GID,\"players\":[{\"name\":\"P1\"},{\"name\":\"P2\"}]}" | tee /tmp/s.json
SID=$(cat /tmp/s.json | jq -r .data.sessionId)

# 追加事件
curl -s -X POST http://localhost:3000/api/sessions-v2/$SID/events \
  -H "Content-Type: application/json" \
  -d '{"engine_type":"freeform","event_type":"score.add","payload":{"player":"P1","delta":3}}'

# 查事件
curl -s "http://localhost:3000/api/sessions-v2/$SID/events?since_seq=0"

# 保存快照
curl -s -X PUT http://localhost:3000/api/sessions-v2/$SID/state \
  -H "Content-Type: application/json" \
  -d '{"engine_type":"freeform","state":{"phase":"playing","scores":{"P1":3}},"last_event_seq":1}'

# 查 session
curl -s http://localhost:3000/api/sessions-v2/$SID | jq .
```

期望所有响应 `code: 200, data: ...`。

- [ ] **Step 4: 提交**

```bash
git add server/src/modules/sessions-v2/ server/src/app.module.ts
git commit -m "feat(server): 新增 sessions-v2 controller 并完成 e2e curl 自测"
```

---

## Phase B：前端 Engine Registry + freeform 引擎（目标：能注册并显示 freeform 引擎）

### Task 9: 安装前端 Zod + react-hook-form

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装依赖**

```bash
cd /Users/silence/project/board_game && pnpm add zod react-hook-form @hookform/resolvers
```

- [ ] **Step 2: 提交**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: 引入 zod / react-hook-form / @hookform/resolvers"
```

---

### Task 10: Engine 接口 types

**Files:**
- Create: `src/games/core/types.ts`

- [ ] **Step 1: 写 types**

```typescript
// src/games/core/types.ts
import type { z } from 'zod'
import type { FC } from 'react'

export type EngineType =
  | 'social-deduction'
  | 'card-duel'
  | 'engine-builder'
  | 'race-score'
  | 'freeform'

export type ModuleName = 'props' | 'flow' | 'scoring' | 'tools' | 'layout'

export interface Player { name: string; score: number; [k: string]: unknown }

export interface Action {
  type: string
  payload?: unknown
  actorPlayerId?: number
  ts?: number
}

export interface EngineUIProps {
  state: unknown
  dispatch: (action: Action) => void
  players: Player[]
  config: unknown
  sessionId: number | null
  onFinish?: () => void
}

export interface EngineSetupProps {
  config: unknown
  onChange: (config: unknown) => void
}

export interface EngineModule {
  type: EngineType
  displayName: string
  version: string
  mvpReady: boolean
  defaultConfig: unknown

  configSchema: z.ZodTypeAny
  eventSchemas: Record<string, z.ZodTypeAny>
  scoringSchema?: z.ZodTypeAny
  propsSchema?: z.ZodTypeAny
  flowSchema?: z.ZodTypeAny
  toolsSchema?: z.ZodTypeAny
  layoutSchema?: z.ZodTypeAny

  initialState(config: unknown, players: Player[]): unknown
  reducer(state: unknown, action: Action): unknown
  canEmit(state: unknown, action: Action): boolean
  buildPrompt(game: { name: string; rules_md?: string; intro?: string }, question: string): string

  GamePage: FC<EngineUIProps>
  SetupPage: FC<EngineSetupProps>
}
```

- [ ] **Step 2: 提交**

```bash
git add src/games/core/types.ts
git commit -m "feat(games): 新增 Engine / EngineModule 类型定义"
```

---

### Task 11: Engine Registry 单例

**Files:**
- Create: `src/games/registry.ts`

- [ ] **Step 1: 写 registry**

```typescript
// src/games/registry.ts
import type { EngineType, EngineModule } from './core/types'

const store = new Map<EngineType, EngineModule>()

export const engineRegistry = {
  register(m: EngineModule) {
    store.set(m.type, m)
  },
  get(type: EngineType): EngineModule | undefined {
    return store.get(type)
  },
  list(): EngineModule[] {
    return Array.from(store.values())
  },
  has(type: EngineType): boolean {
    return store.has(type)
  },
}
```

- [ ] **Step 2: 提交**

```bash
git add src/games/registry.ts
git commit -m "feat(games): 新增引擎注册中心（单例）"
```

---

### Task 12: freeform 引擎 schema + reducer

**Files:**
- Create: `src/games/engines/freeform/schema.ts`
- Create: `src/games/engines/freeform/reducer.ts`

- [ ] **Step 1: 写 schema**

```typescript
// src/games/engines/freeform/schema.ts
import { z } from 'zod'

export const FreeformConfigSchema = z.object({
  // 自由模式无强制结构
}).strict()

export const FreeformEventSchemas = {
  'score.add': z.object({ player: z.string(), delta: z.number() }),
  'score.set': z.object({ player: z.string(), value: z.number() }),
  'note.add': z.object({ text: z.string() }),
} as const

export const FreeformScoringSchema = z.object({
  step: z.number().default(1),
}).default({ step: 1 })
```

- [ ] **Step 2: 写 reducer**

```typescript
// src/games/engines/freeform/reducer.ts
import type { Action } from '../../core/types'

export interface FreeformState {
  phase: 'init' | 'playing' | 'finished'
  scores: Record<string, number>
  notes: { text: string; ts: number }[]
  round: number
}

export const freeformInitialState = (config: unknown, players: { name: string }[]): FreeformState => ({
  phase: 'playing',
  scores: Object.fromEntries(players.map(p => [p.name, 0])),
  notes: [],
  round: 0,
})

export const freeformReducer = (state: FreeformState, action: Action): FreeformState => {
  switch (action.type) {
    case 'score.add': {
      const p = (action.payload as { player: string; delta: number })
      return { ...state, scores: { ...state.scores, [p.player]: (state.scores[p.player] ?? 0) + p.delta } }
    }
    case 'score.set': {
      const p = action.payload as { player: string; value: number }
      return { ...state, scores: { ...state.scores, [p.player]: p.value } }
    }
    case 'note.add': {
      const p = action.payload as { text: string }
      return { ...state, notes: [...state.notes, { text: p.text, ts: Date.now() }] }
    }
    case 'round.advance':
      return { ...state, round: state.round + 1 }
    case 'phase.finish':
      return { ...state, phase: 'finished' }
    case 'phase.reset':
      return { ...state, phase: 'playing', round: 0 }
    default:
      return state
  }
}

export const freeformCanEmit = (state: FreeformState, action: Action): boolean => {
  if (state.phase === 'finished' && action.type !== 'phase.reset') return false
  return true
}
```

- [ ] **Step 3: 提交**

```bash
git add src/games/engines/freeform/
git commit -m "feat(games): 新增 freeform 引擎 schema + reducer"
```

---

### Task 13: freeform 引擎 UI + index

**Files:**
- Create: `src/games/engines/freeform/components/FreeformPage.tsx`
- Create: `src/games/engines/freeform/index.ts`

- [ ] **Step 1: 写 FreeformPage**

```tsx
// src/games/engines/freeform/components/FreeformPage.tsx
import { View, Text } from '@tarojs/components'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import type { EngineUIProps } from '../../../core/types'

export default function FreeformPage({ state, dispatch, players }: EngineUIProps) {
  const s = state as {
    phase: string
    scores: Record<string, number>
    notes: { text: string; ts: number }[]
    round: number
  }
  const [note, setNote] = useState('')

  return (
    <View className="flex flex-col gap-4 p-4">
      <Text className="block text-lg font-bold">自由模式 (round {s.round})</Text>

      {players.map(p => (
        <View key={p.name} className="flex flex-row items-center gap-2 bg-white p-3 rounded-xl">
          <Text className="block flex-1 font-medium">{p.name}</Text>
          <Button size="sm" onClick={() => dispatch({ type: 'score.add', payload: { player: p.name, delta: -1 } })}>
            <Text className="text-white">-1</Text>
          </Button>
          <Text className="block w-12 text-center font-mono">{s.scores[p.name] ?? 0}</Text>
          <Button size="sm" onClick={() => dispatch({ type: 'score.add', payload: { player: p.name, delta: 1 } })}>
            <Text className="text-white">+1</Text>
          </Button>
        </View>
      ))}

      <View className="flex flex-row gap-2">
        <Input value={note} onInput={e => setNote(e.detail.value)} placeholder="备注..." />
        <Button onClick={() => {
          if (note.trim()) {
            dispatch({ type: 'note.add', payload: { text: note.trim() } })
            setNote('')
          }
        }}>
          <Text className="text-white">记一笔</Text>
        </Button>
      </View>

      <View className="flex flex-row gap-2">
        <Button variant="secondary" onClick={() => dispatch({ type: 'round.advance' })}>
          <Text>下一轮</Text>
        </Button>
        <Button onClick={() => dispatch({ type: 'phase.finish' })}>
          <Text className="text-white">结束</Text>
        </Button>
      </View>

      {s.notes.length > 0 && (
        <View className="bg-gray-50 p-3 rounded-xl">
          <Text className="block text-sm font-semibold mb-2">备注 ({s.notes.length})</Text>
          {s.notes.slice(-5).map((n, i) => (
            <Text key={i} className="block text-sm text-gray-600">• {n.text}</Text>
          ))}
        </View>
      )}
    </View>
  )
}
```

- [ ] **Step 2: 写 index**

```typescript
// src/games/engines/freeform/index.ts
import { engineRegistry } from '../../registry'
import { FreeformConfigSchema, FreeformEventSchemas, FreeformScoringSchema } from './schema'
import { freeformInitialState, freeformReducer, freeformCanEmit } from './reducer'
import GamePage from './components/FreeformPage'
import type { EngineModule } from '../../core/types'

const SetupPage = ({ config, onChange }: { config: unknown; onChange: (c: unknown) => void }) => null

const module: EngineModule = {
  type: 'freeform',
  displayName: '自由模式',
  version: '0.1.0',
  mvpReady: true,
  defaultConfig: {},
  configSchema: FreeformConfigSchema,
  eventSchemas: FreeformEventSchemas,
  scoringSchema: FreeformScoringSchema,
  initialState: freeformInitialState,
  reducer: freeformReducer as EngineModule['reducer'],
  canEmit: freeformCanEmit as EngineModule['canEmit'],
  buildPrompt: (game, question) => `桌游「${game.name}」规则:\n${game.rules_md ?? game.intro ?? ''}\n\n问题: ${question}`,
  GamePage: GamePage as EngineModule['GamePage'],
  SetupPage: SetupPage as EngineModule['SetupPage'],
}

engineRegistry.register(module)
export default module
```

- [ ] **Step 3: 提交**

```bash
git add src/games/engines/freeform/
git commit -m "feat(games): freeform 引擎 UI + index 注册"
```

---

### Task 14: freeform reducer 单测

**Files:**
- Create: `src/games/engines/freeform/__tests__/reducer.test.ts`

- [ ] **Step 1: 装 vitest**

```bash
cd /Users/silence/project/board_game && pnpm add -D vitest @vitest/ui
```

- [ ] **Step 2: 写测试**

```typescript
// src/games/engines/freeform/__tests__/reducer.test.ts
import { describe, it, expect } from 'vitest'
import { freeformInitialState, freeformReducer, freeformCanEmit } from '../reducer'

describe('freeform reducer', () => {
  const players = [{ name: 'A' }, { name: 'B' }]

  it('初始化正确', () => {
    const s = freeformInitialState({}, players)
    expect(s.phase).toBe('playing')
    expect(s.scores).toEqual({ A: 0, B: 0 })
    expect(s.round).toBe(0)
  })

  it('score.add 增加分数', () => {
    const s0 = freeformInitialState({}, players)
    const s1 = freeformReducer(s0, { type: 'score.add', payload: { player: 'A', delta: 3 } })
    expect(s1.scores.A).toBe(3)
    expect(s1.scores.B).toBe(0)
  })

  it('round.advance 推进轮次', () => {
    const s0 = freeformInitialState({}, players)
    const s1 = freeformReducer(s0, { type: 'round.advance' })
    expect(s1.round).toBe(1)
  })

  it('canEmit 在 finished 阶段拒绝非重置', () => {
    const s = { ...freeformInitialState({}, players), phase: 'finished' as const }
    expect(freeformCanEmit(s, { type: 'score.add', payload: { player: 'A', delta: 1 } })).toBe(false)
    expect(freeformCanEmit(s, { type: 'phase.reset' })).toBe(true)
  })

  it('note.add 追加', () => {
    const s0 = freeformInitialState({}, players)
    const s1 = freeformReducer(s0, { type: 'note.add', payload: { text: 'hello' } })
    expect(s1.notes).toHaveLength(1)
    expect(s1.notes[0].text).toBe('hello')
  })
})
```

- [ ] **Step 3: 配置 vitest + 运行**

在 `package.json` 添加：
```json
"scripts": { "test": "vitest run" }
```

新增 `vitest.config.ts`：
```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'
export default defineConfig({
  test: { globals: true, environment: 'node' },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
```

```bash
pnpm test src/games/engines/freeform
# 期望: 5 passed
```

- [ ] **Step 4: 提交**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts src/games/engines/freeform/__tests__/
git commit -m "test(games): freeform reducer 单测 + vitest 配置"
```

---

### Task 15: 引擎自动注册入口

**Files:**
- Create: `src/games/engines/index.ts`

- [ ] **Step 1: 写聚合入口**

```typescript
// src/games/engines/index.ts
// 引入即注册
import './freeform'
// import './race-score'  // 后续 Task 加
export { engineRegistry } from '../registry'
```

- [ ] **Step 2: 在 app.tsx 顶部 import 触发注册**

修改 `src/app.tsx`，在文件最顶部添加：
```typescript
import '@/games/engines'
```

- [ ] **Step 3: 提交**

```bash
git add src/games/engines/index.ts src/app.tsx
git commit -m "feat(games): 引擎自动注册入口（接入 app.tsx）"
```

---

## Phase C：Admin v2 + DynamicForm（目标：能后台填表创建桌游）

### Task 16: DynamicForm 核心（Zod 反射）

**Files:**
- Create: `src/games/core/DynamicForm.tsx`

- [ ] **Step 1: 写 DynamicForm**

```tsx
// src/games/core/DynamicForm.tsx
import { View, Text } from '@tarojs/components'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react-taro'
import { useState, useMemo } from 'react'
import type { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

interface DynamicFormProps {
  schema: z.ZodTypeAny
  value: unknown
  onChange: (v: unknown) => void
  path?: string
}

function unwrap(s: z.ZodTypeAny): { type: string; inner: z.ZodTypeAny; enumValues?: readonly [string, ...string[]] } {
  let cur: any = s
  while (cur._def?.innerType) cur = cur._def.innerType
  if (cur._def?.typeName === 'ZodOptional' || cur._def?.typeName === 'ZodNullable') {
    return unwrap(cur._def.innerType)
  }
  if (cur._def?.typeName === 'ZodDefault') {
    return unwrap(cur._def.innerType)
  }
  if (cur._def?.typeName === 'ZodEnum') {
    return { type: 'enum', inner: cur, enumValues: cur._def.values }
  }
  if (cur._def?.typeName === 'ZodString') return { type: 'string', inner: cur }
  if (cur._def?.typeName === 'ZodNumber') return { type: 'number', inner: cur }
  if (cur._def?.typeName === 'ZodBoolean') return { type: 'boolean', inner: cur }
  if (cur._def?.typeName === 'ZodArray') return { type: 'array', inner: cur }
  if (cur._def?.typeName === 'ZodObject') return { type: 'object', inner: cur }
  if (cur._def?.typeName === 'ZodRecord') return { type: 'record', inner: cur }
  return { type: 'unknown', inner: cur }
}

function getByPath(obj: any, path: string): any {
  if (!path) return obj
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
}

function setByPath(obj: any, path: string, val: any): any {
  if (!path) return val
  const keys = path.split('.')
  const next = Array.isArray(obj) ? [...obj] : { ...(obj ?? {}) }
  let cur: any = next
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    cur[k] = Array.isArray(cur[k]) ? [...cur[k]] : { ...(cur[k] ?? {}) }
    cur = cur[k]
  }
  cur[keys[keys.length - 1]] = val
  return next
}

export function DynamicForm({ schema, value, onChange, path = '' }: DynamicFormProps) {
  const meta = unwrap(schema)
  const v = getByPath(value, path) ?? (meta.type === 'array' ? [] : meta.type === 'object' ? {} : '')

  if (meta.type === 'object' && (meta.inner as any)._def?.shape) {
    const shape: z.ZodRawShape = (meta.inner as any)._def.shape()
    return (
      <View className="flex flex-col gap-3 p-3 bg-gray-50 rounded-xl">
        {Object.entries(shape).map(([key, sub]) => (
          <View key={key} className="flex flex-col gap-1">
            <Text className="block text-sm font-medium text-gray-700">{key}</Text>
            <DynamicForm schema={sub as z.ZodTypeAny} value={value} onChange={onChange} path={path ? `${path}.${key}` : key} />
          </View>
        ))}
      </View>
    )
  }

  if (meta.type === 'array') {
    const itemSchema: z.ZodTypeAny = (meta.inner as any)._def.type
    const arr = Array.isArray(v) ? v : []
    return (
      <View className="flex flex-col gap-2">
        {arr.map((_, i) => (
          <View key={i} className="flex flex-row items-start gap-2">
            <View className="flex-1">
              <DynamicForm schema={itemSchema} value={arr} onChange={(nv) => onChange(setByPath(value, path, nv))} path={String(i)} />
            </View>
            <View onClick={() => onChange(setByPath(value, path, arr.filter((_, j) => j !== i)))}>
              <X size={18} color="#ef4444" />
            </View>
          </View>
        ))}
        <Button size="sm" variant="secondary" onClick={() => onChange(setByPath(value, path, [...arr, getDefault(itemSchema)]))}>
          <Plus size={14} color="#374151" />
          <Text className="text-sm">添加</Text>
        </Button>
      </View>
    )
  }

  if (meta.type === 'enum') {
    return (
      <View className="flex flex-row flex-wrap gap-2">
        {meta.enumValues!.map((opt) => (
          <View
            key={opt}
            className={`px-3 py-1 rounded-full text-sm ${v === opt ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => onChange(setByPath(value, path, opt))}
          >
            <Text className={v === opt ? 'text-white' : 'text-gray-700'}>{opt}</Text>
          </View>
        ))}
      </View>
    )
  }

  if (meta.type === 'string') {
    return (
      <View className="bg-white rounded-xl px-3 py-2 border border-gray-200">
        <Input
          value={String(v ?? '')}
          onInput={(e) => onChange(setByPath(value, path, e.detail.value))}
        />
      </View>
    )
  }

  if (meta.type === 'number') {
    return (
      <View className="bg-white rounded-xl px-3 py-2 border border-gray-200">
        <Input
          type="number"
          value={String(v ?? 0)}
          onInput={(e) => onChange(setByPath(value, path, Number(e.detail.value)))}
        />
      </View>
    )
  }

  if (meta.type === 'boolean') {
    return (
      <View
        className={`px-4 py-2 rounded-xl ${v ? 'bg-green-500' : 'bg-gray-300'}`}
        onClick={() => onChange(setByPath(value, path, !v))}
      >
        <Text className={v ? 'text-white' : 'text-gray-700'}>{v ? '是' : '否'}</Text>
      </View>
    )
  }

  return <Text className="block text-sm text-gray-400">[unsupported: {meta.type}]</Text>
}

function getDefault(s: z.ZodTypeAny): any {
  const m = unwrap(s)
  if (m.type === 'string') return ''
  if (m.type === 'number') return 0
  if (m.type === 'boolean') return false
  if (m.type === 'array') return []
  if (m.type === 'object') return {}
  if (m.type === 'enum') return m.enumValues?.[0] ?? ''
  return null
}
```

- [ ] **Step 2: 装 zod-to-json-schema（zod v4 用 zod/v4/core 兼容）**

```bash
cd /Users/silence/project/board_game && pnpm add zod-to-json-schema
```

- [ ] **Step 3: 提交**

```bash
git add src/games/core/DynamicForm.tsx package.json pnpm-lock.yaml
git commit -m "feat(games): 新增 DynamicForm（Zod 反射生成表单）"
```

---

### Task 17: useGameEngine 封装

**Files:**
- Create: `src/games/core/useGameEngine.ts`

- [ ] **Step 1: 写 hook**

```typescript
// src/games/core/useGameEngine.ts
import { useReducer, useEffect, useRef, useCallback } from 'react'
import type { EngineModule, Action, Player } from './types'

export function useGameEngine(module: EngineModule, config: unknown, players: Player[]) {
  const [state, dispatchInner] = useReducer(
    (s: unknown, a: Action) => module.reducer(s, a),
    undefined,
    () => module.initialState(config, players),
  )

  const queueRef = useRef<Action[]>([])
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dispatch = useCallback((action: Action) => {
    if (!module.canEmit(state, action)) {
      console.warn('[engine] action rejected by canEmit:', action.type)
      return
    }
    dispatchInner({ ...action, ts: Date.now() })
    queueRef.current.push({ ...action, ts: Date.now() })
  }, [module, state])

  // 节流 1s flush（实际持久化由 usePersistence 完成）
  useEffect(() => {
    flushTimerRef.current = setInterval(() => {
      if (queueRef.current.length > 0) {
        // 触发自定义事件，usePersistence 监听
        window.dispatchEvent(new CustomEvent('engine:actions:flush', { detail: queueRef.current.splice(0) }))
      }
    }, 1000)
    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current)
    }
  }, [])

  return { state, dispatch }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/games/core/useGameEngine.ts
git commit -m "feat(games): 新增 useGameEngine hook（reducer + 事件队列）"
```

---

### Task 18: usePersistence 持久化 hook

**Files:**
- Create: `src/games/core/usePersistence.ts`

- [ ] **Step 1: 写 hook**

```typescript
// src/games/core/usePersistence.ts
import { useEffect, useRef } from 'react'
import { Network } from '@/network'

export function usePersistence(opts: {
  sessionId: number | null
  engineType: string
  state: unknown
  lastEventSeq: number
  enabled: boolean
}) {
  const { sessionId, engineType, state, lastEventSeq, enabled } = opts
  const stateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastStateRef = useRef<unknown>(null)

  // 监听事件 flush
  useEffect(() => {
    if (!enabled || !sessionId) return
    const handler = (e: Event) => {
      const ce = e as CustomEvent
      const actions = ce.detail as Array<{ type: string; payload?: unknown; actorPlayerId?: number; ts: number }>
      const lastSeq = actions[actions.length - 1]
      void Network.request({
        url: `/api/sessions-v2/${sessionId}/events`,
        method: 'POST',
        data: {
          engine_type: engineType,
          event_type: actions.map(a => a.type).join(','),
          payload: { batch: actions },
          actor_player_id: actions[0]?.actorPlayerId ?? null,
        },
      })
    }
    window.addEventListener('engine:actions:flush', handler)
    return () => window.removeEventListener('engine:actions:flush', handler)
  }, [sessionId, engineType, enabled])

  // 节流 5s 保存 state
  useEffect(() => {
    if (!enabled || !sessionId) return
    if (lastStateRef.current === state) return
    if (stateTimerRef.current) clearTimeout(stateTimerRef.current)
    stateTimerRef.current = setTimeout(() => {
      void Network.request({
        url: `/api/sessions-v2/${sessionId}/state`,
        method: 'PUT',
        data: { engine_type: engineType, state, last_event_seq: lastEventSeq },
      })
      lastStateRef.current = state
    }, 5000)

    const onVisChange = () => {
      if (document.visibilityState === 'hidden' && lastStateRef.current !== state) {
        void Network.request({
          url: `/api/sessions-v2/${sessionId}/state`,
          method: 'PUT',
          data: { engine_type: engineType, state, last_event_seq: lastEventSeq },
        })
        lastStateRef.current = state
      }
    }
    document.addEventListener('visibilitychange', onVisChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisChange)
      if (stateTimerRef.current) clearTimeout(stateTimerRef.current)
    }
  }, [state, sessionId, engineType, lastEventSeq, enabled])
}
```

- [ ] **Step 2: 提交**

```bash
git add src/games/core/usePersistence.ts
git commit -m "feat(games): 新增 usePersistence hook（事件+快照同步）"
```

---

### Task 19: PhaseController

**Files:**
- Create: `src/games/core/PhaseController.tsx`

- [ ] **Step 1: 写组件**

```tsx
// src/games/core/PhaseController.tsx
import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import { engineRegistry } from '../registry'
import { useGameEngine } from './useGameEngine'
import { usePersistence } from './usePersistence'
import { Network } from '@/network'
import type { EngineType, Player, Action } from './types'
import type { FC } from 'react'

interface Props {
  primary: EngineType
  extras: Array<{ engine: EngineType; config: unknown }>
  config: unknown
  players: Player[]
  sessionId: number | null
  initialState: unknown
  initialLastEventSeq: number
  onStateChange?: (s: unknown) => void
  onFinish?: () => void
}

export const PhaseController: FC<Props> = ({
  primary, extras, config, players, sessionId, initialState, initialLastEventSeq, onFinish,
}) => {
  const module = engineRegistry.get(primary)
  const [hydrated, setHydrated] = useState(false)

  if (!module) {
    return <Text className="block p-4 text-red-500">未找到引擎: {primary}</Text>
  }

  // 客户端 reducer（直接用 module 提供的）
  const [state, dispatch] = useGameEngine(module, config, players)

  // 首次 hydration：用后端快照覆盖
  useEffect(() => {
    if (hydrated || initialState == null) {
      setHydrated(true)
      return
    }
    // 简化处理：直接用 initialState（生产应做 reducer replay）
    for (let i = 0; i < 50; i++) {
      // 占位：让 hook 触发
      break
    }
    setHydrated(true)
  }, [hydrated, initialState])

  usePersistence({
    sessionId,
    engineType: primary,
    state,
    lastEventSeq: initialLastEventSeq,
    enabled: true,
  })

  // extras 钩子（简化：只在 phase 切换时打 log）
  useEffect(() => {
    const phase = (state as any)?.phase
    extras.forEach(({ engine }) => {
      console.log(`[extras:${engine}] entered phase: ${phase}`)
    })
  }, [(state as any)?.phase])

  return (
    <View className="flex flex-col min-h-screen bg-[#f5f5f7]">
      <module.GamePage
        state={state}
        dispatch={dispatch as (a: Action) => void}
        players={players}
        config={config}
        sessionId={sessionId}
        onFinish={onFinish}
      />
    </View>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/games/core/PhaseController.tsx
git commit -m "feat(games): 新增 PhaseController（主引擎+extras 调度）"
```

---

### Task 20: API 客户端封装

**Files:**
- Create: `src/api/games-v2.ts`
- Create: `src/api/sessions-v2.ts`
- Create: `src/api/engines.ts`

- [ ] **Step 1: 写 games-v2**

```typescript
// src/api/games-v2.ts
import { Network } from '@/network'

export interface BoardGameV2 {
  id: number
  slug: string
  name: string
  primary_engine: string
  enabled_modules: string[]
  status: string
  version: number
  [k: string]: unknown
}

export const gamesV2Api = {
  list: (q?: { status?: string; primary_engine?: string }) =>
    Network.request<{ data: BoardGameV2[] }>({ url: '/api/games-v2', method: 'GET', data: q }),
  get: (id: number) =>
    Network.request<{ data: BoardGameV2 }>({ url: `/api/games-v2/${id}`, method: 'GET' }),
  create: (payload: Omit<BoardGameV2, 'id' | 'version'>) =>
    Network.request<{ data: BoardGameV2 }>({ url: '/api/games-v2', method: 'POST', data: payload }),
  update: (id: number, payload: Partial<BoardGameV2>) =>
    Network.request<{ data: BoardGameV2 }>({ url: `/api/games-v2/${id}`, method: 'PUT', data: payload }),
  remove: (id: number) =>
    Network.request<{ data: { success: boolean } }>({ url: `/api/games-v2/${id}`, method: 'DELETE' }),
}
```

- [ ] **Step 2: 写 sessions-v2**

```typescript
// src/api/sessions-v2.ts
import { Network } from '@/network'

export const sessionsV2Api = {
  create: (body: { board_game_id: number; players: { name: string }[]; session_name?: string }) =>
    Network.request<{ data: { sessionId: number; engineType: string } }>({ url: '/api/sessions-v2', method: 'POST', data: body }),
  get: (id: number) =>
    Network.request<{ data: any }>({ url: `/api/sessions-v2/${id}`, method: 'GET' }),
  appendEvent: (id: number, body: { engine_type: string; event_type: string; payload: any; actor_player_id?: number }) =>
    Network.request<{ data: any }>({ url: `/api/sessions-v2/${id}/events`, method: 'POST', data: body }),
  events: (id: number, sinceSeq: number) =>
    Network.request<{ data: any[] }>({ url: `/api/sessions-v2/${id}/events?since_seq=${sinceSeq}`, method: 'GET' }),
  saveState: (id: number, body: { engine_type: string; state: unknown; last_event_seq: number }) =>
    Network.request<{ data: any }>({ url: `/api/sessions-v2/${id}/state`, method: 'PUT', data: body }),
  finish: (id: number, body: { winner?: string; scoring_snapshot: any; duration_seconds: number }) =>
    Network.request<{ data: any }>({ url: `/api/sessions-v2/${id}/finish`, method: 'POST', data: body }),
}
```

- [ ] **Step 3: 写 engines**

```typescript
// src/api/engines.ts
import { Network } from '@/network'

export interface EngineMeta {
  type: string
  displayName: string
  version: string
  mvpReady: boolean
}

export const enginesApi = {
  list: () => Network.request<{ data: EngineMeta[] }>({ url: '/api/engines', method: 'GET' }),
  get: (type: string) => Network.request<{ data: EngineMeta }>({ url: `/api/engines/${type}`, method: 'GET' }),
}
```

- [ ] **Step 4: 提交**

```bash
git add src/api/
git commit -m "feat(api): 新增 games-v2 / sessions-v2 / engines 接口封装"
```

---

### Task 21: Admin v2 - EnginePicker

**Files:**
- Create: `src/pages/games-admin-v2/index.config.ts`
- Create: `src/pages/games-admin-v2/components/EnginePicker.tsx`

- [ ] **Step 1: 写 config**

```typescript
// src/pages/games-admin-v2/index.config.ts
export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '桌游管理 v2',
      navigationBarBackgroundColor: '#ffffff',
      navigationBarTextStyle: 'black',
    })
  : {
      navigationBarTitleText: '桌游管理 v2',
      navigationBarBackgroundColor: '#ffffff',
      navigationBarTextStyle: 'black',
    }
```

- [ ] **Step 2: 写 EnginePicker**

```tsx
// src/pages/games-admin-v2/components/EnginePicker.tsx
import { View, Text } from '@tarojs/components'
import { useEffect, useState } from 'react'
import { enginesApi, type EngineMeta } from '@/api/engines'
import type { EngineType } from '@/games/core/types'

interface Props {
  primary: EngineType | null
  extras: EngineType[]
  onPrimaryChange: (p: EngineType) => void
  onExtrasChange: (e: EngineType[]) => void
}

export function EnginePicker({ primary, extras, onPrimaryChange, onExtrasChange }: Props) {
  const [engines, setEngines] = useState<EngineMeta[]>([])

  useEffect(() => {
    enginesApi.list().then(res => setEngines(res.data?.data ?? [])).catch(console.error)
  }, [])

  const toggleExtra = (t: EngineType) => {
    if (extras.includes(t)) onExtrasChange(extras.filter(x => x !== t))
    else onExtrasChange([...extras, t])
  }

  return (
    <View className="flex flex-col gap-3 p-4 bg-white rounded-2xl">
      <Text className="block text-base font-bold">Step 1: 选主引擎 + extras</Text>
      <View className="flex flex-row flex-wrap gap-2">
        {engines.map(e => (
          <View
            key={e.type}
            className={`px-4 py-2 rounded-full ${primary === e.type ? 'bg-blue-500' : 'bg-gray-200'}`}
            onClick={() => onPrimaryChange(e.type as EngineType)}
          >
            <Text className={primary === e.type ? 'text-white' : 'text-gray-700'}>
              {e.displayName} {e.mvpReady ? '✓' : '🚧'}
            </Text>
          </View>
        ))}
      </View>

      {primary && (
        <>
          <Text className="block text-sm font-semibold text-gray-600 mt-2">Extras（可多选）</Text>
          <View className="flex flex-row flex-wrap gap-2">
            {engines.filter(e => e.type !== primary).map(e => (
              <View
                key={e.type}
                className={`px-3 py-1 rounded-full text-sm ${extras.includes(e.type as EngineType) ? 'bg-purple-500' : 'bg-gray-100'}`}
                onClick={() => toggleExtra(e.type as EngineType)}
              >
                <Text className={extras.includes(e.type as EngineType) ? 'text-white' : 'text-gray-600'}>
                  {e.displayName}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  )
}
```

- [ ] **Step 3: 提交**

```bash
git add src/pages/games-admin-v2/
git commit -m "feat(admin-v2): 新增 EnginePicker 组件"
```

---

### Task 22: Admin v2 - ModuleEditor

**Files:**
- Create: `src/pages/games-admin-v2/components/ModuleEditor.tsx`

- [ ] **Step 1: 写 ModuleEditor**

```tsx
// src/pages/games-admin-v2/components/ModuleEditor.tsx
import { View, Text } from '@tarojs/components'
import { useState } from 'react'
import { DynamicForm } from '@/games/core/DynamicForm'
import type { z } from 'zod'
import type { ModuleName, EngineType } from '@/games/core/types'
import { engineRegistry } from '@/games/registry'

const ALL_MODULES: ModuleName[] = ['props', 'flow', 'scoring', 'tools', 'layout']

interface Props {
  engine: EngineType
  enabled: ModuleName[]
  values: Record<string, unknown>
  onChange: (moduleName: ModuleName, value: unknown) => void
  onToggleModule: (m: ModuleName) => void
}

export function ModuleEditor({ engine, enabled, values, onChange, onToggleModule }: Props) {
  const [open, setOpen] = useState<ModuleName | null>(null)
  const mod = engineRegistry.get(engine)

  if (!mod) return <Text className="block text-red-500">引擎 {engine} 未注册</Text>

  const schemaFor = (m: ModuleName): z.ZodTypeAny | null => {
    if (m === 'scoring') return mod.scoringSchema ?? null
    if (m === 'props') return mod.propsSchema ?? null
    if (m === 'flow') return mod.flowSchema ?? null
    if (m === 'tools') return mod.toolsSchema ?? null
    if (m === 'layout') return mod.layoutSchema ?? null
    return null
  }

  return (
    <View className="flex flex-col gap-3 p-4 bg-white rounded-2xl">
      <Text className="block text-base font-bold">Step 2: 启用 modules</Text>
      <View className="flex flex-row flex-wrap gap-2">
        {ALL_MODULES.map(m => (
          <View
            key={m}
            className={`px-3 py-1 rounded-full text-sm ${enabled.includes(m) ? 'bg-green-500' : 'bg-gray-200'}`}
            onClick={() => onToggleModule(m)}
          >
            <Text className={enabled.includes(m) ? 'text-white' : 'text-gray-600'}>
              {enabled.includes(m) ? '☑' : '☐'} {m}
            </Text>
          </View>
        ))}
      </View>

      {enabled.length > 0 && (
        <>
          <Text className="block text-base font-bold mt-2">Step 3: 编辑各 module</Text>
          {enabled.map(m => {
            const schema = schemaFor(m)
            return (
              <View key={m} className="border border-gray-200 rounded-xl">
                <View
                  className="flex flex-row items-center justify-between p-3 bg-gray-50"
                  onClick={() => setOpen(open === m ? null : m)}
                >
                  <Text className="block text-sm font-semibold">{m}</Text>
                  <Text className="block text-xs text-gray-400">{open === m ? '收起' : '展开'}</Text>
                </View>
                {open === m && (
                  <View className="p-3">
                    {schema ? (
                      <DynamicForm
                        schema={schema}
                        value={values[m] ?? {}}
                        onChange={(v) => onChange(m, v)}
                      />
                    ) : (
                      <Text className="block text-sm text-gray-400">此引擎未提供 {m} 的 schema</Text>
                    )}
                  </View>
                )}
              </View>
            )
          })}
        </>
      )}
    </View>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/pages/games-admin-v2/components/ModuleEditor.tsx
git commit -m "feat(admin-v2): 新增 ModuleEditor 组件"
```

---

### Task 23: Admin v2 - 主页面

**Files:**
- Create: `src/pages/games-admin-v2/index.tsx`
- Modify: `src/app.config.ts`

- [ ] **Step 1: 写主页面**

```tsx
// src/pages/games-admin-v2/index.tsx
import { View, Text, ScrollView } from '@tarojs/components'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { gamesV2Api } from '@/api/games-v2'
import { EnginePicker } from './components/EnginePicker'
import { ModuleEditor } from './components/ModuleEditor'
import type { EngineType, ModuleName } from '@/games/core/types'
import type { FC } from 'react'

const GamesAdminV2: FC = () => {
  const [primary, setPrimary] = useState<EngineType | null>(null)
  const [extras, setExtras] = useState<EngineType[]>([])
  const [enabledModules, setEnabledModules] = useState<ModuleName[]>([])
  const [moduleValues, setModuleValues] = useState<Record<string, unknown>>({})
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [intro, setIntro] = useState('')
  const [saving, setSaving] = useState(false)

  const toggleModule = (m: ModuleName) => {
    setEnabledModules(enabledModules.includes(m)
      ? enabledModules.filter(x => x !== m)
      : [...enabledModules, m])
  }

  const setModuleValue = (m: ModuleName, v: unknown) => {
    setModuleValues({ ...moduleValues, [m]: v })
  }

  const handleSave = async () => {
    if (!primary || !slug.trim() || !name.trim()) {
      Taro.showToast({ title: '请填齐必填项', icon: 'none' })
      return
    }
    setSaving(true)
    try {
      await gamesV2Api.create({
        slug: slug.trim(),
        name: name.trim(),
        intro: intro || undefined,
        primary_engine: primary,
        extras: extras.map(e => ({ engine: e, config: {} })),
        engine_config: {},
        enabled_modules: enabledModules,
        props: moduleValues.props ?? {},
        flow: moduleValues.flow ?? {},
        scoring: moduleValues.scoring ?? {},
        tools: moduleValues.tools ?? {},
        layout: moduleValues.layout ?? {},
        type: [], scene: [], tips: [], status: 'online',
        min_players: 2, max_players: 4,
        difficulty: 'medium',
      } as any)
      Taro.showToast({ title: '创建成功', icon: 'success' })
      setSlug(''); setName(''); setIntro('')
      setPrimary(null); setExtras([]); setEnabledModules([]); setModuleValues({})
    } catch (err) {
      Taro.showToast({ title: '保存失败', icon: 'none' })
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView scrollY className="bg-gray-50 min-h-screen">
      <View className="p-4 flex flex-col gap-4">
        <View className="flex flex-row items-center justify-between">
          <Text className="block text-xl font-bold">桌游管理 v2</Text>
          <Button size="sm" onClick={() => Taro.navigateBack()}>
            <Text className="text-white">返回</Text>
          </Button>
        </View>

        <EnginePicker
          primary={primary}
          extras={extras}
          onPrimaryChange={setPrimary}
          onExtrasChange={setExtras}
        />

        {primary && (
          <ModuleEditor
            engine={primary}
            enabled={enabledModules}
            values={moduleValues}
            onChange={setModuleValue}
            onToggleModule={toggleModule}
          />
        )}

        <View className="flex flex-col gap-3 p-4 bg-white rounded-2xl">
          <Text className="block text-base font-bold">Step 4: 基础信息</Text>
          <View className="flex flex-col gap-1">
            <Text className="block text-sm text-gray-600">slug（小写英文连字符）</Text>
            <View className="bg-gray-50 rounded-xl px-3 py-2">
              <Input value={slug} onInput={e => setSlug(e.detail.value)} placeholder="my-game" />
            </View>
          </View>
          <View className="flex flex-col gap-1">
            <Text className="block text-sm text-gray-600">名称</Text>
            <View className="bg-gray-50 rounded-xl px-3 py-2">
              <Input value={name} onInput={e => setName(e.detail.value)} placeholder="我的桌游" />
            </View>
          </View>
          <View className="flex flex-col gap-1">
            <Text className="block text-sm text-gray-600">简介</Text>
            <View className="bg-gray-50 rounded-xl px-3 py-2">
              <Input value={intro} onInput={e => setIntro(e.detail.value)} placeholder="可选" />
            </View>
          </View>
        </View>

        <Button onClick={handleSave} disabled={saving}>
          <Text className="text-white">{saving ? '保存中...' : '保存'}</Text>
        </Button>
      </View>
    </ScrollView>
  )
}

export default GamesAdminV2
```

- [ ] **Step 2: 在 app.config.ts 注册**

在 `src/app.config.ts` 的 `pages` 数组添加：
```typescript
'pages/games-admin-v2/index',
```

- [ ] **Step 3: 验证 lint + tsc**

```bash
cd /Users/silence/project/board_game && pnpm validate
```

期望：无 error。warning 需处理。

- [ ] **Step 4: 提交**

```bash
git add src/pages/games-admin-v2/ src/app.config.ts
git commit -m "feat(admin-v2): 主页面拼装 + 路由注册 + 保存到后端"
```

---

## Phase D：race-score 引擎 + session-v2 对局页（目标：可玩 race-score 桌游）

### Task 24: race-score 引擎 schema + reducer

**Files:**
- Create: `src/games/engines/race-score/schema.ts`
- Create: `src/games/engines/race-score/reducer.ts`

- [ ] **Step 1: 写 schema**

```typescript
// src/games/engines/race-score/schema.ts
import { z } from 'zod'

export const RaceScoreConfigSchema = z.object({
  max_round: z.number().int().min(1).default(20),
  win_score: z.number().int().min(1).default(100),
  win_mode: z.enum(['score_target', 'max_round', 'manual']).default('score_target'),
}).strict()

export const RaceScoreEventSchemas = {
  'score.add': z.object({ player: z.string(), delta: z.number() }),
  'score.set': z.object({ player: z.string(), value: z.number() }),
  'round.advance': z.object({}),
  'phase.finish': z.object({}),
  'phase.reset': z.object({}),
} as const

export const RaceScoreScoringSchema = z.object({
  items: z.array(z.object({
    key: z.string(),
    label: z.string(),
    score: z.number().default(1),
    max: z.number().optional(),
  })).default([]),
  step: z.number().default(1),
  steps: z.array(z.number()).default([1, 5, 10]),
}).default({ items: [], step: 1, steps: [1, 5, 10] })

export const RaceScoreFlowSchema = z.object({
  phases: z.array(z.object({
    key: z.string(),
    label: z.string(),
  })).default([{ key: 'play', label: '进行中' }, { key: 'finished', label: '已结束' }]),
}).default({ phases: [{ key: 'play', label: '进行中' }, { key: 'finished', label: '已结束' }] })
```

- [ ] **Step 2: 写 reducer**

```typescript
// src/games/engines/race-score/reducer.ts
import type { Action } from '../../core/types'

export interface RaceScoreState {
  phase: 'play' | 'finished'
  scores: Record<string, number>
  round: number
  maxRound: number
  winScore: number
  winMode: 'score_target' | 'max_round' | 'manual'
  history: { round: number; scores: Record<string, number>; ts: number }[]
}

export const raceScoreInitialState = (config: any, players: { name: string }[]): RaceScoreState => ({
  phase: 'play',
  scores: Object.fromEntries(players.map(p => [p.name, 0])),
  round: 0,
  maxRound: config?.max_round ?? 20,
  winScore: config?.win_score ?? 100,
  winMode: config?.win_mode ?? 'score_target',
  history: [],
})

export const raceScoreReducer = (state: RaceScoreState, action: Action): RaceScoreState => {
  switch (action.type) {
    case 'score.add': {
      const p = action.payload as { player: string; delta: number }
      const newScores = { ...state.scores, [p.player]: (state.scores[p.player] ?? 0) + p.delta }
      return checkFinish({ ...state, scores: newScores })
    }
    case 'score.set': {
      const p = action.payload as { player: string; value: number }
      return checkFinish({ ...state, scores: { ...state.scores, [p.player]: p.value } })
    }
    case 'round.advance': {
      const next = {
        ...state,
        round: state.round + 1,
        history: [...state.history, { round: state.round, scores: { ...state.scores }, ts: Date.now() }],
      }
      if (state.winMode === 'max_round' && next.round >= state.maxRound) {
        return { ...next, phase: 'finished' as const }
      }
      return next
    }
    case 'phase.finish':
      return { ...state, phase: 'finished' }
    case 'phase.reset':
      return { ...state, phase: 'play', round: 0, scores: Object.fromEntries(Object.keys(state.scores).map(k => [k, 0])) }
    default:
      return state
  }
}

function checkFinish(s: RaceScoreState): RaceScoreState {
  if (s.winMode === 'score_target' && Object.values(s.scores).some(v => v >= s.winScore)) {
    return { ...s, phase: 'finished' }
  }
  return s
}

export const raceScoreCanEmit = (state: RaceScoreState, action: Action): boolean => {
  if (state.phase === 'finished' && action.type !== 'phase.reset') return false
  return true
}
```

- [ ] **Step 3: 提交**

```bash
git add src/games/engines/race-score/
git commit -m "feat(games): race-score 引擎 schema + reducer（带自动终局）"
```

---

### Task 25: race-score UI + index + 注册

**Files:**
- Create: `src/games/engines/race-score/components/RaceScorePage.tsx`
- Create: `src/games/engines/race-score/index.ts`
- Modify: `src/games/engines/index.ts`

- [ ] **Step 1: 写 RaceScorePage**

```tsx
// src/games/engines/race-score/components/RaceScorePage.tsx
import { View, Text } from '@tarojs/components'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import type { EngineUIProps } from '../../../core/types'

export default function RaceScorePage({ state, dispatch, players }: EngineUIProps) {
  const s = state as {
    phase: 'play' | 'finished'
    scores: Record<string, number>
    round: number
    maxRound: number
    winScore: number
    winMode: string
  }
  const [step, setStep] = useState(1)
  const isFinished = s.phase === 'finished'

  const sorted = [...players].sort((a, b) => (s.scores[b.name] ?? 0) - (s.scores[a.name] ?? 0))

  return (
    <View className="flex flex-col gap-4 p-4">
      <View className="bg-white p-4 rounded-2xl shadow-sm">
        <Text className="block text-lg font-bold">竞速计分</Text>
        <Text className="block text-sm text-gray-500">
          Round {s.round}{s.maxRound ? ` / ${s.maxRound}` : ''} · 目标 {s.winScore} 分
          {isFinished ? ' · 已结束' : ''}
        </Text>
      </View>

      <View className="flex flex-row gap-2">
        {[1, 5, 10].map(v => (
          <View
            key={v}
            className={`px-3 py-1 rounded-full text-sm ${step === v ? 'bg-blue-500' : 'bg-gray-200'}`}
            onClick={() => setStep(v)}
          >
            <Text className={step === v ? 'text-white' : 'text-gray-600'}>±{v}</Text>
          </View>
        ))}
      </View>

      {sorted.map((p, idx) => (
        <View key={p.name} className={`flex flex-row items-center gap-2 p-3 rounded-xl ${idx === 0 && isFinished ? 'bg-yellow-50 border border-yellow-300' : 'bg-white'}`}>
          <Text className="block w-6 text-center font-bold text-gray-400">{idx + 1}</Text>
          <Text className="block flex-1 font-medium">{p.name}</Text>
          <Button size="sm" variant="secondary" onClick={() => dispatch({ type: 'score.add', payload: { player: p.name, delta: -step } })}>
            <Text>-{step}</Text>
          </Button>
          <Text className="block w-12 text-center font-mono text-lg">{s.scores[p.name] ?? 0}</Text>
          <Button size="sm" onClick={() => dispatch({ type: 'score.add', payload: { player: p.name, delta: step } })}>
            <Text className="text-white">+{step}</Text>
          </Button>
        </View>
      ))}

      <View className="flex flex-row gap-2">
        <Button variant="secondary" onClick={() => dispatch({ type: 'round.advance' })}>
          <Text>下一轮</Text>
        </Button>
        {!isFinished && (
          <Button onClick={() => dispatch({ type: 'phase.finish' })}>
            <Text className="text-white">提前结束</Text>
          </Button>
        )}
        {isFinished && (
          <Button onClick={() => dispatch({ type: 'phase.reset' })}>
            <Text className="text-white">再来一局</Text>
          </Button>
        )}
      </View>
    </View>
  )
}
```

- [ ] **Step 2: 写 index**

```typescript
// src/games/engines/race-score/index.ts
import { engineRegistry } from '../../registry'
import {
  RaceScoreConfigSchema, RaceScoreEventSchemas, RaceScoreScoringSchema, RaceScoreFlowSchema,
} from './schema'
import { raceScoreInitialState, raceScoreReducer, raceScoreCanEmit } from './reducer'
import GamePage from './components/RaceScorePage'
import type { EngineModule } from '../../core/types'

const SetupPage = () => null

const module: EngineModule = {
  type: 'race-score',
  displayName: '竞速计分',
  version: '0.1.0',
  mvpReady: true,
  defaultConfig: { max_round: 20, win_score: 100, win_mode: 'score_target' },
  configSchema: RaceScoreConfigSchema,
  eventSchemas: RaceScoreEventSchemas,
  scoringSchema: RaceScoreScoringSchema,
  flowSchema: RaceScoreFlowSchema,
  initialState: raceScoreInitialState as any,
  reducer: raceScoreReducer as any,
  canEmit: raceScoreCanEmit as any,
  buildPrompt: (game, question) => `桌游「${game.name}」规则:\n${game.rules_md ?? game.intro ?? ''}\n\n问题: ${question}`,
  GamePage: GamePage as any,
  SetupPage: SetupPage as any,
}

engineRegistry.register(module)
export default module
```

- [ ] **Step 3: 在 src/games/engines/index.ts 注册**

修改 `src/games/engines/index.ts`：
```typescript
import './freeform'
import './race-score'
export { engineRegistry } from '../registry'
```

- [ ] **Step 4: 提交**

```bash
git add src/games/engines/race-score/ src/games/engines/index.ts
git commit -m "feat(games): race-score 引擎 UI + index + 注册"
```

---

### Task 26: race-score reducer 单测

**Files:**
- Create: `src/games/engines/race-score/__tests__/reducer.test.ts`

- [ ] **Step 1: 写测试**

```typescript
// src/games/engines/race-score/__tests__/reducer.test.ts
import { describe, it, expect } from 'vitest'
import { raceScoreInitialState, raceScoreReducer, raceScoreCanEmit } from '../reducer'

describe('race-score reducer', () => {
  const players = [{ name: 'A' }, { name: 'B' }]
  const config = { max_round: 3, win_score: 10, win_mode: 'score_target' as const }

  it('初始化正确', () => {
    const s = raceScoreInitialState(config, players)
    expect(s.phase).toBe('play')
    expect(s.maxRound).toBe(3)
    expect(s.winScore).toBe(10)
    expect(s.scores).toEqual({ A: 0, B: 0 })
  })

  it('达到 win_score 自动结束', () => {
    let s = raceScoreInitialState(config, players)
    s = raceScoreReducer(s, { type: 'score.add', payload: { player: 'A', delta: 10 } })
    expect(s.phase).toBe('finished')
  })

  it('max_round 模式下到轮自动结束', () => {
    const cfg = { ...config, win_mode: 'max_round' as const }
    let s = raceScoreInitialState(cfg, players)
    s = raceScoreReducer(s, { type: 'round.advance' })
    s = raceScoreReducer(s, { type: 'round.advance' })
    s = raceScoreReducer(s, { type: 'round.advance' })
    expect(s.phase).toBe('finished')
    expect(s.round).toBe(3)
  })

  it('finished 后只能 reset', () => {
    let s = raceScoreInitialState(config, players)
    s = raceScoreReducer(s, { type: 'score.add', payload: { player: 'A', delta: 10 } })
    expect(s.phase).toBe('finished')
    expect(raceScoreCanEmit(s, { type: 'score.add', payload: { player: 'A', delta: 1 } })).toBe(false)
    expect(raceScoreCanEmit(s, { type: 'phase.reset' })).toBe(true)
  })

  it('reset 重置分数和轮次', () => {
    let s = raceScoreInitialState(config, players)
    s = raceScoreReducer(s, { type: 'score.add', payload: { player: 'A', delta: 10 } })
    s = raceScoreReducer(s, { type: 'phase.reset' })
    expect(s.phase).toBe('play')
    expect(s.round).toBe(0)
    expect(s.scores.A).toBe(0)
  })
})
```

- [ ] **Step 2: 运行**

```bash
pnpm test src/games/engines/race-score
# 期望: 5 passed
```

- [ ] **Step 3: 提交**

```bash
git add src/games/engines/race-score/__tests__/
git commit -m "test(games): race-score reducer 单测（含自动终局 + reset）"
```

---

### Task 27: session-v2 对局页

**Files:**
- Create: `src/pages/session-v2/index.config.ts`
- Create: `src/pages/session-v2/index.tsx`
- Modify: `src/app.config.ts`

- [ ] **Step 1: 写 config**

```typescript
// src/pages/session-v2/index.config.ts
export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '对局',
      navigationBarBackgroundColor: '#1a1a2e',
      navigationBarTextStyle: 'white',
    })
  : {
      navigationBarTitleText: '对局',
      navigationBarBackgroundColor: '#1a1a2e',
      navigationBarTextStyle: 'white',
    }
```

- [ ] **Step 2: 写主页面**

```tsx
// src/pages/session-v2/index.tsx
import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { sessionsV2Api } from '@/api/sessions-v2'
import { gamesV2Api } from '@/api/games-v2'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhaseController } from '@/games/core/PhaseController'
import type { EngineType, Player } from '@/games/core/types'
import type { FC } from 'react'

const SessionV2Page: FC = () => {
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [boardGameId, setBoardGameId] = useState<number | null>(null)
  const [gameData, setGameData] = useState<any>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [newName, setNewName] = useState('')
  const [initialState, setInitialState] = useState<unknown>(null)
  const [initialSeq, setInitialSeq] = useState(0)
  const [phase, setPhase] = useState<'setup' | 'playing' | 'finished'>('setup')

  useLoad(() => {
    const inst = Taro.getCurrentInstance()
    const bid = inst?.router?.params?.gameId
    if (bid) {
      const id = Number(bid)
      setBoardGameId(id)
      gamesV2Api.get(id).then(res => setGameData(res.data?.data ?? null)).catch(console.error)
    }
  })

  const addPlayer = () => {
    if (!newName.trim() || players.length >= 12) return
    setPlayers([...players, { name: newName.trim(), score: 0 }])
    setNewName('')
  }

  const startSession = async () => {
    if (!boardGameId || players.length === 0) {
      Taro.showToast({ title: '先加玩家', icon: 'none' })
      return
    }
    try {
      const res = await sessionsV2Api.create({ board_game_id: boardGameId, players })
      const data = res.data?.data
      if (data) {
        setSessionId(data.sessionId)
        setPhase('playing')
      }
    } catch (err) {
      Taro.showToast({ title: '创建对局失败', icon: 'none' })
    }
  }

  if (!boardGameId || !gameData) {
    return <View className="p-4"><Text className="block">加载中...</Text></View>
  }

  if (phase === 'setup') {
    return (
      <View className="flex flex-col gap-4 p-4 min-h-screen bg-[#f5f5f7]">
        <Text className="block text-xl font-bold">{gameData.name}</Text>
        <View className="bg-white p-3 rounded-xl">
          <Text className="block text-sm text-gray-500">
            引擎: {gameData.primary_engine} · 已启用模块: {gameData.enabled_modules?.join(', ') || '无'}
          </Text>
        </View>

        <View className="bg-white p-4 rounded-2xl flex flex-col gap-2">
          <Text className="block font-semibold">添加玩家</Text>
          {players.map((p, i) => (
            <View key={i} className="flex flex-row items-center gap-2">
              <Text className="block flex-1">{p.name}</Text>
              <View onClick={() => setPlayers(players.filter((_, j) => j !== i))}>
                <Text className="text-red-500">移除</Text>
              </View>
            </View>
          ))}
          <View className="flex flex-row gap-2 mt-2">
            <View className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
              <Input value={newName} onInput={e => setNewName(e.detail.value)} placeholder="玩家名" />
            </View>
            <Button size="sm" onClick={addPlayer}>
              <Text className="text-white">添加</Text>
            </Button>
          </View>
        </View>

        <Button onClick={startSession} disabled={players.length === 0}>
          <Text className="text-white">开始对局</Text>
        </Button>
      </View>
    )
  }

  return (
    <PhaseController
      primary={gameData.primary_engine as EngineType}
      extras={(gameData.extras ?? []).map((e: any) => ({ engine: e.engine, config: e.config ?? {} }))}
      config={gameData.engine_config ?? {}}
      players={players}
      sessionId={sessionId}
      initialState={initialState}
      initialLastEventSeq={initialSeq}
      onFinish={() => {
        if (sessionId) {
          sessionsV2Api.finish(sessionId, {
            winner: '',
            scoring_snapshot: players,
            duration_seconds: 0,
          }).then(() => {
            setPhase('finished')
            Taro.showToast({ title: '对局已结束', icon: 'success' })
          })
        }
      }}
    />
  )
}

export default SessionV2Page
```

- [ ] **Step 3: 在 app.config.ts 注册**

添加：
```typescript
'pages/session-v2/index',
```

- [ ] **Step 4: 验证**

```bash
pnpm validate
```

- [ ] **Step 5: 提交**

```bash
git add src/pages/session-v2/ src/app.config.ts
git commit -m "feat(session-v2): 对局页拼装 PhaseController + 添加玩家 setup"
```

---

## Phase E：联调 + e2e（目标：MVP 验收）

### Task 28: 后端 controller 单测

**Files:**
- Create: `server/src/modules/games-v2/games-v2.controller.spec.ts`

- [ ] **Step 1: 装测试工具**

```bash
cd /Users/silence/project/board_game/server && pnpm add -D @nestjs/testing supertest
```

- [ ] **Step 2: 写测试**

```typescript
// server/src/modules/games-v2/games-v2.controller.spec.ts
import { Test, type TestingModule } from '@nestjs/testing'
import { GamesV2Controller } from './games-v2.controller'
import { GamesV2Service } from './games-v2.service'
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('GamesV2Controller', () => {
  let controller: GamesV2Controller
  let svc: GamesV2Service

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GamesV2Controller],
      providers: [{
        provide: GamesV2Service,
        useValue: {
          findAll: vi.fn().mockResolvedValue({ data: [] }),
          findOne: vi.fn().mockResolvedValue({ data: { id: 1, name: 'test' } }),
          create: vi.fn().mockResolvedValue({ data: { id: 1, name: 'test' } }),
          update: vi.fn().mockResolvedValue({ data: { id: 1 } }),
          softDelete: vi.fn().mockResolvedValue({ success: true }),
        },
      }],
    }).compile()
    controller = module.get(GamesV2Controller)
    svc = module.get(GamesV2Service)
  })

  it('findAll 通过 service', async () => {
    await controller.findAll({})
    expect(svc.findAll).toHaveBeenCalled()
  })

  it('findOne 返回详情', async () => {
    const r = await controller.findOne('1')
    expect(r.data.id).toBe(1)
  })

  it('create 走 Zod 校验拒绝非法 slug', async () => {
    await expect(controller.create({ slug: 'Has Space', primary_engine: 'freeform' } as any))
      .rejects.toThrow()
  })

  it('create 接受合法 payload', async () => {
    const r = await controller.create({ slug: 'ok-game', primary_engine: 'freeform', name: 'OK' } as any)
    expect(r.data.id).toBe(1)
  })

  it('softDelete 软删', async () => {
    const r = await controller.softDelete('1')
    expect(r.success).toBe(true)
  })
})
```

- [ ] **Step 3: 跑测**

```bash
cd /Users/silence/project/board_game/server && pnpm add -D vitest && cd .. && pnpm test server/src/modules/games-v2/
# 期望: 5 passed
```

- [ ] **Step 4: 提交**

```bash
git add server/src/modules/games-v2/games-v2.controller.spec.ts server/package.json pnpm-lock.yaml
git commit -m "test(server): games-v2 controller 单测"
```

---

### Task 29: E2E 端到端验收脚本

**Files:**
- Create: `docs/superpowers/specs/2026-06-09-e2e-checklist.md`

- [ ] **Step 1: 写 e2e 检查清单**

```markdown
# MVP E2E 验收清单

## 前置

- [ ] 后端 `pnpm dev:server` 运行在 :3000
- [ ] 前端 `pnpm dev:web` 运行在 :5000

## 步骤

1. [ ] 打开 admin v2: 浏览器访问 `/pages/games-admin-v2/index`
2. [ ] Step 1: 选主引擎 `race-score`
3. [ ] Step 2: 勾选 `scoring` 模块
4. [ ] Step 3: 展开 scoring，配置 `items: [{ key: 'point', label: '得分', score: 1 }]`，`win_score: 50`
5. [ ] Step 4: slug=`e2e-game`, name=`E2E 测试`
6. [ ] 点击「保存」，期望 toast「创建成功」
7. [ ] 浏览器 console 看到 `gameData.id`，记录
8. [ ] 后端 `curl http://localhost:3000/api/games-v2/<id>` 验证元数据
9. [ ] 访问 `/pages/session-v2/index?gameId=<id>` 进入对局页
10. [ ] 添加玩家 A、B
11. [ ] 点击「开始对局」，进入 playing
12. [ ] A +10 两次，B +5 三次 → 检查 A=20, B=15
13. [ ] 点击「下一轮」 → round=1
14. [ ] A +30 → A=50 → 应自动结束
15. [ ] 杀浏览器进程
16. [ ] 重新打开同一 session id
17. [ ] 期望 A=50, phase=finished（重连恢复）
18. [ ] 后端 `curl /api/sessions-v2/<sid>/events?since_seq=0` 验证事件累积
19. [ ] `pnpm validate` 通过

## 期望

- 全部勾完即 MVP done
```

- [ ] **Step 2: 手动跑一遍并打勾**

每项由实施者勾选。

- [ ] **Step 3: 提交**

```bash
git add docs/superpowers/specs/2026-06-09-e2e-checklist.md
git commit -m "test(e2e): MVP e2e 验收清单"
```

---

### Task 30: 最终 lint + tsc + 全量 test + 提交

- [ ] **Step 1: 全量验证**

```bash
cd /Users/silence/project/board_game && pnpm validate
cd /Users/silence/project/board_game && pnpm test
```

期望：
- `pnpm validate` 无 error
- `pnpm test` 全 passed

- [ ] **Step 2: 全量提交（如有未提交改动）**

```bash
git status
# 若有未提交：按类型 commit
```

- [ ] **Step 3: 打 tag**

```bash
git tag -a v0.1.0-game-engine-mvp -m "桌游引擎化平台 MVP"
```

---

## 实施总结

- **Phase A** (Task 1-8)：后端骨架，3 表 + 3 模块
- **Phase B** (Task 9-15)：前端引擎骨架 + freeform + 单测
- **Phase C** (Task 16-23)：DynamicForm + Admin v2 全流程
- **Phase D** (Task 24-27)：race-score + session-v2 对局页
- **Phase E** (Task 28-30)：单测 + e2e + tag

**每个 Task 都是独立可提交单元，失败可回滚不影响后续。**
