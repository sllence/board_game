# 清理 board_games.sections 字段，统一使用 rules 作为规则源

## 概述

数据库 `board_games` 表中存在 `sections`（JSONB，旧字段）和 `rules`（TEXT，新字段）两套规则源。本次彻底下线 `sections`：
- **数据库**：删除 `board_games.sections` 列
- **后端**：去掉 `ai.service.ts`、`sessions.service.ts` 中对 `sections` 的引用，统一改用 `rules` 字段
- **前端**：去掉 `navigator`、`rule-detail` 中 `sections` 的回退渲染逻辑，仅渲染 `rules`

后端服务接口（`/api/games/:id`、`/api/sessions/:id`、`/api/ai/...`）行为会变化：响应不再含 `sections`，AI 问答改用 `rules` 组装 prompt。

- **平台**：mobile（保持现状）
- **后端**：现有 Supabase 数据库，需新建迁移文件
- **前端**：现有页面，无新增页面

## 技术方案

| 维度 | 选择 | 理由 |
|------|------|------|
| 规则源 | 统一为 `board_games.rules`（Markdown TEXT） | 与 `rule-detail` 升级方向一致；维护成本低 |
| 数据库迁移 | 新建 `00X_drop_board_games_sections.sql`，`ALTER TABLE board_games DROP COLUMN sections` | 现有迁移位于 `server/src/storage/database/003_create_feedbacks_table.sql`，保持序号顺延 |
| AI prompt 来源 | 用 `game.rules` 替换 `game.sections`，按 Markdown 原文直接拼入 prompt | `rules` 已是 Markdown 文本，无需再组装 |
| 会话接口字段 | `sessions.service.ts` 关联查询中 `select` 去掉 `sections`，保留 `rules` 与 `tips` | 与数据库列对齐 |
| 前端渲染 | 移除 `sections` 的回退分支与对应状态/导入；统一 `<RichText>` 渲染 `rules` | UI 更简洁，逻辑与数据源强一致 |
| Drizzle schema | 确认 `shared/schema.ts` 中 `boardGames` 已无 `sections` 字段（实际已无），无需改动 | 与数据库列对齐 |

## 功能模块

### 1. 数据库：删除 board_games.sections 列

- **新增文件**：`server/src/storage/database/004_drop_board_games_sections.sql`
- **SQL 内容**：
  ```sql
  -- 删除 board_games 表的旧规则字段 sections（统一使用 rules 字段）
  ALTER TABLE board_games DROP COLUMN IF EXISTS sections;
  ```

### 2. 后端：AI 问答改用 rules 字段

- **文件**：`server/src/modules/ai/ai.service.ts`
- **改动点**：
  1. `select('name, sections, tips')` → `select('name, rules, tips')`
  2. `sectionsContent` 拼接逻辑删除，改为 `rulesContent = game.rules || ''`
  3. Prompt 模板中 `${sectionsContent}` 替换为 `${rulesContent}`

### 3. 后端：会话详情接口去掉 sections

- **文件**：`server/src/modules/sessions/sessions.service.ts`
- **改动点**：`select('*, game:board_games(id, name, min_players, max_players, sections, tips, icon_bg, hero_bg, scoring_config)')` → `select('*, game:board_games(id, name, min_players, max_players, rules, tips, icon_bg, hero_bg, scoring_config)')`

### 4. 前端：对局页面移除 sections 渲染

- **文件**：`src/pages/navigator/index.tsx`
- **改动点**：
  1. `BoardGame` 接口删除 `sections: { title, content }[]`，保留/增加 `rules?: string`
  2. 局部 `sections` 计算（line ~350）删除
  3. 两处"规则速查"模块（viewing 阶段 ~454 行、playing 阶段 ~714 行）改为：仅当 `game.rules` 非空时显示，使用 `markdownToRichText` + `<RichText>` 渲染
  4. 移除 `Accordion`/`AccordionItem`/`AccordionTrigger`/`AccordionContent` 在该模块的引用（AI 问答区可能仍用 Accordion，需保留对应 import；按需精准删除）

### 5. 前端：规则详情页移除 sections 回退

- **文件**：`src/pages/rule-detail/index.tsx`
- **改动点**：
  1. `BoardGameDetail` 接口删除 `sections?: Section[]`（按字段定义 ~line 33），保留 `rules?: string`
  2. 删除 "旧的规则章节 - 保持向后兼容" 整块 JSX（~line 212-253）
  3. 删除 `sections` 计算、相关 `Section` 类型，若全文件无引用则一并删除
  4. 保留"游戏规则 - 新的统一字段"块（用 `game.rules` + `<RichText>` 渲染）

## 是否有原型设计

否（属于字段清理/接口对齐，不涉及新页面或视觉风格变化；不涉及交互改动，仅把"规则速查"从 sections 渲染改为 rules 渲染，且 rule-detail 页面已用 rules 渲染作为参考样式）

## 实施步骤

1. **数据库迁移** — 新建 `server/src/storage/database/004_drop_board_games_sections.sql`，在 `board_games` 表上执行 `DROP COLUMN IF EXISTS sections`（通过 `exec_sql` 在 develop 环境执行）。
   - 关键文件：`server/src/storage/database/004_drop_board_games_sections.sql`

2. **后端：AI 问答改用 rules** — 改写 `server/src/modules/ai/ai.service.ts`：将 `select` 改为 `('name, rules, tips')`；删除 `sectionsContent` 拼接，改为 `rulesContent = game.rules || ''`；Prompt 模板中替换变量。
   - 关键文件：`server/src/modules/ai/ai.service.ts`

3. **后端：会话接口去除 sections** — 改 `server/src/modules/sessions/sessions.service.ts` 的关联 `select`，去掉 `sections`、加入 `rules`。
   - 关键文件：`server/src/modules/sessions/sessions.service.ts`

4. **后端接口回归测试** — 用 curl 调 `GET /api/games/:id`、`GET /api/sessions/:id` 验证响应中 `game.sections` 字段消失、`game.rules` 存在；测试 `POST /api/ai/...`（如适用）确认 prompt 正常生成。
   - 关键文件：`server/src/modules/games/games.service.ts`（只读确认）

5. **前端：移除 navigator 中 sections 渲染** — 在 `src/pages/navigator/index.tsx` 中：`BoardGame` 接口去掉 `sections` 增加 `rules?`；删除 `sections` 计算；两处"规则速查"改为仅渲染 `game.rules`（`<RichText>` + `markdownToRichText`），无 rules 则隐藏该模块；清理不再使用的 import。
   - 关键文件：`src/pages/navigator/index.tsx`、`src/lib/markdown.ts`（只读）

6. **前端：移除 rule-detail 中 sections 回退** — 在 `src/pages/rule-detail/index.tsx` 中：`BoardGameDetail` 接口去掉 `sections`；删除"旧的规则章节 - 保持向后兼容"整块 JSX 及 `sections` 计算与 `Section` 类型；保留"游戏规则 - 新的统一字段"块。
   - 关键文件：`src/pages/rule-detail/index.tsx`

7. **前后端匹配验证 + `pnpm validate`** — 复检前端读取的 `game.rules` 字段与后端响应结构一致；运行 `pnpm validate` 修复所有 TypeScript / ESLint error。
   - 关键文件：全项目（验证步骤）
