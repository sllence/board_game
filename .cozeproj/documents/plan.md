# 对局详情"精彩瞬间"上传照片失败 — 修复计划

## 概述

修复 `src/pages/navigator/index.tsx`（对局详情页）中"精彩瞬间"上传照片功能在**小程序端**报错的问题。问题表现为前端使用 `JSON.parse` 解析 `uploadFile` 返回值时，因小程序环境返回的 `res.data` 已经是 JS 对象（而非字符串），导致 `JSON.parse` 抛出异常，用户始终看到"上传失败，请重试"。

## 技术方案

| 维度 | 选择 | 理由 |
|------|------|------|
| 问题类型 | 跨端兼容 Bug | 小程序 `Taro.uploadFile` 返回的 `res.data` 是已解析对象，H5 是字符串 |
| 修复范围 | 仅前端 | 后端接口逻辑正确，无需改动 |
| 修复参考 | `games-admin/index.tsx` 已有正确模式 | 同一项目中已验证的跨端兼容写法 |

## 根因分析

`src/pages/navigator/index.tsx` 第 259 行：
```typescript
const parsed = JSON.parse(uploadRes.data)  // ❌ 小程序中 uploadRes.data 已是对象
```

- **H5 端**：`Taro.uploadFile` 返回 `res.data` 为响应体**字符串** → `JSON.parse` 正常
- **小程序端（微信/抖音）**：`Taro.uploadFile` 返回 `res.data` 为已解析的 **JavaScript 对象** → `JSON.parse` 抛出 `SyntaxError` → 被 catch 捕获，提示"上传失败，请重试"

项目中 `games-admin/index.tsx` 已有正确的跨端兼容写法：
```typescript
const data = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data
```

## 是否有原型设计

否（bug 修复，不涉及 UI 变更）

## 实施步骤

1. **修复上传照片 JSON.parse 跨端兼容问题** — 修改 `src/pages/navigator/index.tsx` 第 259 行，将 `JSON.parse(uploadRes.data)` 改为 `typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data`，确保 H5 和小程序双端都能正确解析响应
   - 涉及文件：`src/pages/navigator/index.tsx`

2. **修复反馈页面上传图片的同类型问题** — 修改 `src/pages/feedback/index.tsx` 第 62 行，同样的 `JSON.parse(uploadRes.data)` 问题，采用相同修复方式
   - 涉及文件：`src/pages/feedback/index.tsx`

3. **类型检查与验证** — 执行 `pnpm validate` 确保无 TypeScript 和 ESLint 错误