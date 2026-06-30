# 手指选人分享转发功能修复计划

## 概述

排查并修复"数智局伴"微信小程序中手指选人页面分享转发按钮灰色不可用的问题。

## 问题根因

**`useShareAppMessage` hook 在 Taro 4.x Vite 编译模式下未正确注册到微信小程序页面生命周期。**

排查证据：
1. 编译产物 `dist/pages/finger-picker/index.json` 中**缺少 `enableShareAppMessage: true`** 配置项
2. 编译产物 `dist/pages/finger-picker/index.js` 中 Taro 运行时调用 `t.taroExports.useShareAppMessage(...)`，但 `createPageConfig` 未将其正确转换为 `onShareAppMessage` 生命周期
3. 对比微信其他页面（dice、index 等）的编译 JSON，同样缺失 `enableShareAppMessage`，但用户反馈仅 finger-picker 异常

## 技术方案

| 维度 | 选择 | 理由 |
|------|------|------|
| 修复方式 | 页面配置 + 分享按钮双重保障 | 1. 加 `enableShareAppMessage` 激活右上角菜单分享；2. 加 `open-type="share"` 按钮提供直接入口 |
| 兼容范围 | 微信小程序 + 抖音小程序 | 确保跨平台分享可用 |

## 修复步骤

1. **修改 `index.config.ts`** — 添加 `enableShareAppMessage: true` 配置，让微信小程序明确开启页面的转发功能
2. **在页面添加分享按钮** — 在右上角设置按钮旁边添加一个 `open-type="share"` 的分享按钮，用户可直接点击分享
3. **编译验证** — 重新编译并检查 JSON 配置是否正确包含分享相关字段

## 实施步骤

1. 修改页面配置 `src/pages/finger-picker/index.config.ts`，添加 `enableShareAppMessage: true`
2. 修改页面代码 `src/pages/finger-picker/index.tsx`，在右上角添加分享按钮
3. 执行 `pnpm validate` 类型检查
4. 执行 `pnpm build:weapp` 编译验证