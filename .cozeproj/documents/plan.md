# 计划：修复桌游馆卡片（移除表情 logo + 修复时间显示）

## 概述

修复桌游馆页面（`pages/games/index`）中的两个视觉/逻辑 Bug：移除桌游卡片左侧的类型表情图标，同时修复桌游时长字段因前后端字段名不一致导致不显示的问题。

## 技术方案

| 维度 | 选择 | 理由 |
|------|------|------|
| 修改范围 | 仅 `src/pages/games/index.tsx` | 两个问题均在该文件的卡片渲染逻辑中 |
| 影响面 | 仅该文件 | 不涉及后端、路由或其他页面 |

## 功能模块

### 1. 移除表情 logo

在 games 页面的桌游卡片中，左侧有一个带背景色的图标区域（第 311–313 行），显示了游戏类型对应的 emoji（如 ♟️、🧩、🎭 等）。去掉这块表情 logo，仅保留干净的信息布局。

### 2. 修复时间显示

- **现状**：前端 BoardGame 接口字段为 `duration: number`，但后端 SQL 返回的是 `min_duration` 和 `max_duration`，导致 `game.duration` 为 `undefined`，时长不展示。
- **修复**：将接口字段 `duration` 替换为 `min_duration: number`、`max_duration: number`，展示改为 `{min_duration}-{max_duration}分钟` 格式。

## 是否有原型设计

否（本任务属于 Bug 修复 + 样式优化，不涉及新功能或 UI 重设计，不需要原型设计）

## 实施步骤

1. **修改 BoardGame 接口** — 在 `src/pages/games/index.tsx` 中将 `duration: number` 替换为 `min_duration: number, max_duration: number`
2. **移除表情 logo 并修复时间展示** — 移除左侧类型 emoji 图标区块（第 311-313 行），将第 322 行的 `⏱ {game.duration}min` 改为 `{game.min_duration}-{game.max_duration}分钟`
3. **执行 `pnpm validate` 校验** — 确保 TypeScript 和 ESLint 通过，无未使用变量等问题
4. **编译检查** — 执行 `pnpm build` 确认构建正常

## 页面规格

无页面新增，不涉及导航结构变更。