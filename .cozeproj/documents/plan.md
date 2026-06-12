# 修复对局计时器每次打开都重置的问题

## 概述

对局页面的计时器使用本地 `elapsedSeconds` 累加，依赖定时保存到后端来持久化。用户离开再回来时读到的是旧值。改为基于开局时间 `created_at` 实时计算已过秒数，无需定时保存。

## 技术方案

| 维度 | 选择 | 理由 |
|------|------|------|
| 修复方式 | 基于 `created_at` 实时计算已过秒数 | 无需定时保存，天然准确，离开再回来自动恢复 |
| 已结束对局 | 使用后端存储的 `duration_seconds` | 已结束的对局时长已固定，不需要再计算 |
| 进行中对局 | `(Date.now() - created_at) / 1000` 作为基准，继续每秒累加 | 保证页面内计时连续 |

## 功能模块

### 对局计时器改为基于开局时间计算

- **文件**：`src/pages/navigator/index.tsx`
- **改动点**：
  1. 新增 `startedAt` 状态，存储开局时间戳（毫秒）
  2. 创建对局时记录 `Date.now()` 作为 `startedAt`
  3. 从后端恢复对局时，用 `created_at` 解析为 `startedAt`
  4. `elapsedSeconds` 的初始值改为 `Math.floor((Date.now() - startedAt) / 1000)`，然后每秒 +1
  5. 移除定时保存 `elapsedSeconds` 的 effect（保留分数变化保存）
- **数据结构**：不变

## 是否有原型设计

否

## 实施步骤

1. 修复 navigator 页面的计时器逻辑：新增 `startedAt` 状态，基于开局时间计算 `elapsedSeconds` 初始值，移除计时器定时保存 effect
2. 执行 `pnpm validate` 校验
