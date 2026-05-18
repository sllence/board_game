# 手指选人工具 设计文档

**日期：** 2026-05-18  
**状态：** 待实现

---

## 概述

在工具箱的"随机类"分组中新增"手指选人"工具。多人同时将手指按在屏幕上，系统为每个触摸点分配不同颜色，保持按压一定时间后自动触发酷炫动画，最终随机选出中奖者（颜色保持亮起，其余熄灭）。

---

## 用户流程

```
进入页面
  → 全屏深色 Canvas，提示"请将手指放在屏幕上"
  → 手指按下 → Canvas 显示彩色光圈（每个触摸点一种颜色）
  → ≥2 个触摸点且保持不松手 → 屏幕中央开始 3 秒倒计时（3、2、1）
  → 有人松手 → 倒计时重置，回到等待状态
  → 倒计时结束 → 锁定所有触摸点，播放选人动画
  → 动画结束 → 中奖者颜色保持亮起，其余熄灭，显示结果文字
  → 点击屏幕任意位置 → 重置，重新开始
```

---

## 页面布局

- **全屏 Canvas**：背景色 `#0a0a0f`，负责触摸检测和所有动画渲染
- **右上角**：设置按钮（齿轮图标，白色，绝对定位覆盖在 Canvas 上）
- **顶部中央**：状态提示文字（叠加在 Canvas 上，或由 Canvas 绘制）
- **设置面板**：底部弹出 Sheet

---

## 触控处理

- 监听全屏 Canvas 的 `onTouchStart / onTouchMove / onTouchEnd`
- 每个触摸点用 `touch.identifier` 唯一标识
- 颜色从预设 10 种高饱和度颜色中按顺序分配：
  `#ef4444`（红）、`#f97316`（橙）、`#eab308`（黄）、`#22c55e`（绿）、`#06b6d4`（青）、`#3b82f6`（蓝）、`#a855f7`（紫）、`#ec4899`（粉）、`#f8fafc`（白）、`#fbbf24`（金）
- 手指离开屏幕 → 移除该触摸点，倒计时重置
- 最多支持 10 个触摸点（颜色池上限）

---

## 核心数据结构

```typescript
type TouchPoint = {
  id: number              // touch.identifier
  x: number
  y: number
  color: string           // 预设颜色池中分配
  state: 'active' | 'winner' | 'eliminated'
  particles: Particle[]   // 粒子特效用
}

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  radius: number
  color: string
}

type Settings = {
  mode: 'single' | 'multi' | 'group'
  count: number           // 多人模式选几人 / 分组模式分几组
  effect: 'pulse' | 'scan' | 'explode' | 'ripple'
}
```

---

## 选人模式

| 模式 | 说明 |
|------|------|
| 随机选 1 人（默认） | 最终只有 1 个颜色亮着 |
| 随机选多人 | 可配置选 N 人（2～参与人数-1），最终 N 个颜色亮着 |
| 随机分组 | 可配置组数，每组颜色相同（如 3 组：红红、蓝蓝、绿绿） |

---

## 动画特效（4 种）

### 1. 脉冲消除（默认）
所有光圈同时脉冲跳动，逐个随机熄灭（scale 缩小到 0），最后剩下中奖者放大发光。

### 2. 扫描光束
屏幕中心发出旋转光束，扫到谁谁高亮，速度先快后慢，最后定格在中奖者。

### 3. 粒子爆炸
非中奖者光圈爆炸成同色粒子向四周扩散消散，中奖者光圈放大留存。

### 4. 彩虹波纹
从屏幕中心向外扩散彩色波纹，每轮波纹淘汰一个触摸点，最后剩下中奖者。

---

## Canvas 渲染

**每帧渲染循环（requestAnimationFrame）：**
1. `clearRect` 清空画布
2. 绘制深色背景
3. 绘制每个触摸点（光圈、粒子、波纹）
4. 绘制倒计时文字（屏幕中央）
5. 绘制状态提示文字

**触摸点视觉状态：**
- `active`（等待/倒计时）：彩色光圈 + 外圈呼吸动画（scale 1.0→1.2 循环）+ 中心半透明填充
- 倒计时阶段：光圈变实心，加速脉冲
- `winner`：放大 + 持续发光光晕
- `eliminated`：根据特效播放消除动画，最终 alpha → 0

**Taro Canvas 适配：**
- 使用 `ref` 获取 canvas 节点
- H5：`canvas.getContext('2d')`
- 小程序：`Taro.createSelectorQuery().select('#finger-canvas').fields({ node: true })`
- 封装 `useCanvas` hook 统一两端差异

---

## 设置面板

底部弹出 Sheet，包含：

1. **选人模式**：单选按钮组（选1人 / 选多人 / 分组）
2. **人数/组数**：模式为多人或分组时显示数字步进器
3. **动画特效**：4 个卡片，每个有图标和名称，当前选中高亮边框

配置持久化：`Taro.setStorageSync('fingerPickerSettings', settings)`，进入页面时读取。

---

## 页面配置

```typescript
// index.config.ts
export default definePageConfig({
  navigationBarTitleText: '手指选人',
  navigationBarBackgroundColor: '#0a0a0f',
  navigationBarTextStyle: 'white',
})
```

---

## 文件变更清单

| 操作 | 文件 |
|------|------|
| 新增 | `src/pages/finger-picker/index.tsx` |
| 新增 | `src/pages/finger-picker/index.config.ts` |
| 修改 | `src/app.config.ts`（注册页面路径） |
| 修改 | `src/pages/tools/index.tsx`（随机类新增入口） |

---

## 工具箱入口

```typescript
{
  key: 'finger-picker',
  name: '手指选人',
  desc: '多人触屏随机选人',
  icon: <Hand size={20} color="#6366f1" />,
  iconBg: '#ede9fe',
  iconColor: '#6366f1',
  path: '/pages/finger-picker/index',
  soon: false,
}
```
