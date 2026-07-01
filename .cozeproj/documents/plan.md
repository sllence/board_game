# 对局时长展示格式统一计划

## 概述

将对局时长（以秒为单位的 `session.duration`）的展示统一为"x天x小时x分钟"格式，覆盖首页最近对局、对局历史、海报页、游戏对局详情和轮盘收藏页等所有展示对局时长的地方。

## 技术方案

| 维度 | 选择 | 理由 |
|------|------|------|
| 实现方式 | 提取公共 `formatGameDuration` 工具函数到 `src/lib/utils.ts` | 统一逻辑、避免重复、便于维护 |
| 格式规则 | 自适应的"天+小时+分钟"格式，零值字段自动省略 | 简洁清晰，不显示无意义的"0天0小时" |
| 保留例外 | `navigator/index.tsx` 中的**实时计时器**（第929行）保留 `mm:ss` 格式 | 实时运行中对局用计时器格式更直观，已完成对局才用新格式 |

## 是否有原型设计

否（样式优化/展示格式修改，非新功能开发）

## 实施步骤

1. **添加公共工具函数** — 在 `src/lib/utils.ts` 中添加 `formatGameDuration(seconds: number): string`，支持"x天x小时x分钟"自适应格式（零值字段自动省略）
2. **修改首页对局列表** — `src/pages/index/index.tsx` 第306行：将 `{Math.floor(session.duration / 60)}分钟` 改为调用 `formatGameDuration`
3. **修改海报页对局时长** — `src/pages/poster/index.tsx` 第104-112行：将 `formatDuration` 函数改为调用公共的 `formatGameDuration`
4. **修改游戏对局详情** — `src/pages/navigator/index.tsx` 第570-573行/第645行：将 `formatTime` 中用于已完成对局的部分改为调用公共 `formatGameDuration`（保留第929行实时计时器的 `mm:ss` 格式）
5. **修改轮盘收藏页** — `src/pages/wheel-favorites/index.tsx` 第56-61行：将 `formatTime` 改为调用公共 `formatGameDuration`