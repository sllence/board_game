# 手指选人 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在工具箱随机类新增"手指选人"页面，支持多人触屏、倒计时、4 种动画特效和 3 种选人模式。

**Architecture:** 全屏 Canvas 负责触摸检测与所有动画渲染，使用 `requestAnimationFrame` 驱动帧循环；状态机管理 idle→waiting→countdown→animating→result 五个阶段；设置通过 `Taro.setStorageSync` 持久化。

**Tech Stack:** Taro 4, React, TypeScript, Canvas 2D API, lucide-react-taro, Sheet 组件

---

## 文件清单

| 操作 | 文件 | 职责 |
|------|------|------|
| 新增 | `src/pages/finger-picker/index.tsx` | 主页面：Canvas + 触摸 + 动画 + 设置面板 |
| 新增 | `src/pages/finger-picker/index.config.ts` | 页面导航栏配置 |
| 修改 | `src/app.config.ts` | 注册页面路径 |
| 修改 | `src/pages/tools/index.tsx` | 随机类新增入口 |

---

### Task 1: 页面配置 + 路由注册 + 工具箱入口

**Files:**
- Create: `src/pages/finger-picker/index.config.ts`
- Modify: `src/app.config.ts`
- Modify: `src/pages/tools/index.tsx`

- [ ] **Step 1: 创建页面配置文件**

```typescript
// src/pages/finger-picker/index.config.ts
export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '手指选人',
      navigationBarBackgroundColor: '#0a0a0f',
      navigationBarTextStyle: 'white',
    })
  : {
      navigationBarTitleText: '手指选人',
      navigationBarBackgroundColor: '#0a0a0f',
      navigationBarTextStyle: 'white',
    }
```

- [ ] **Step 2: 在 app.config.ts 注册页面路径**

在 `src/app.config.ts` 的 `pages` 数组末尾添加：
```typescript
'pages/finger-picker/index',
```

- [ ] **Step 3: 在工具箱随机类添加入口**

在 `src/pages/tools/index.tsx` 顶部 import 中添加 `Hand`：
```typescript
import { Dices, Timer, Layers, Shuffle, Calculator, Target, Hand } from 'lucide-react-taro'
```

在 `TOOL_GROUPS[0].tools`（随机类）数组末尾添加：
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
},
```

- [ ] **Step 4: 验证编译**

```bash
pnpm validate
```

Expected: 无 TypeScript 错误

---

### Task 6: 设置面板 + 持久化 + JSX 渲染

**Files:**
- Modify: `src/pages/finger-picker/index.tsx`

- [ ] **Step 1: 添加 saveSettings 函数**

在 `finishAnimation` 之后添加：

```typescript
  const saveSettings = (s: Settings) => {
    setSettings(s)
    try { Taro.setStorageSync(SETTINGS_KEY, JSON.stringify(s)) } catch { /* ignore */ }
  }
```

- [ ] **Step 2: 添加 JSX return 语句（完整页面结构）**

在 `saveSettings` 之后添加 return 语句，关闭组件：

```typescript
  return (
    <View
      className="relative overflow-hidden"
      style={{ width: screenSize.width, height: screenSize.height, background: '#0a0a0f' }}
    >
      <Canvas
        type="2d"
        id="fingerCanvas"
        style={{ width: screenSize.width, height: screenSize.height, display: 'block' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* 右上角设置按钮 */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetTrigger
          className="absolute top-10 right-4 w-10 h-10 flex items-center justify-center rounded-full"
          style={{ background: 'rgba(255,255,255,0.12)' }}
        >
          <Settings size={20} color="#ffffff" />
        </SheetTrigger>
        <SheetContent side="bottom" className="bg-[#1a1a2e] border-t border-white/10 pb-10">
          <SheetHeader>
            <SheetTitle className="text-white">设置</SheetTitle>
          </SheetHeader>

          {/* 选人模式 */}
          <View className="mt-4">
            <Text className="text-sm text-gray-400 mb-2 block">选人模式</Text>
            <View className="flex flex-row gap-2">
              {(['single', 'multi', 'group'] as ModeType[]).map((m) => (
                <View
                  key={m}
                  className="flex-1 py-2 rounded-xl flex items-center justify-center"
                  style={{
                    background: settings.mode === m ? '#6366f1' : 'rgba(255,255,255,0.08)',
                    border: settings.mode === m ? '2px solid #6366f1' : '2px solid transparent',
                  }}
                  onClick={() => saveSettings({ ...settings, mode: m })}
                >
                  <Text className="text-sm text-white">
                    {m === 'single' ? '选1人' : m === 'multi' ? '选多人' : '分组'}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* 人数/组数步进器 */}
          {settings.mode !== 'single' && (
            <View className="mt-4 flex flex-row items-center justify-between">
              <Text className="text-sm text-gray-400">
                {settings.mode === 'multi' ? '选几人' : '分几组'}
              </Text>
              <View className="flex flex-row items-center gap-4">
                <View
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                  onClick={() => saveSettings({ ...settings, count: Math.max(2, settings.count - 1) })}
                >
                  <Text className="text-white text-lg">-</Text>
                </View>
                <Text className="text-white text-lg font-bold w-6 text-center">{settings.count}</Text>
                <View
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                  onClick={() => saveSettings({ ...settings, count: Math.min(9, settings.count + 1) })}
                >
                  <Text className="text-white text-lg">+</Text>
                </View>
              </View>
            </View>
          )}

          {/* 动画特效 */}
          <View className="mt-4">
            <Text className="text-sm text-gray-400 mb-2 block">动画特效</Text>
            <View className="flex flex-row flex-wrap gap-2">
              {([
                { key: 'pulse', label: '脉冲消除' },
                { key: 'scan', label: '扫描光束' },
                { key: 'explode', label: '粒子爆炸' },
                { key: 'ripple', label: '彩虹波纹' },
              ] as { key: EffectType; label: string }[]).map((e) => (
                <View
                  key={e.key}
                  className="px-4 py-2 rounded-xl"
                  style={{
                    background: settings.effect === e.key ? '#6366f1' : 'rgba(255,255,255,0.08)',
                    border: settings.effect === e.key ? '2px solid #6366f1' : '2px solid transparent',
                  }}
                  onClick={() => saveSettings({ ...settings, effect: e.key })}
                >
                  <Text className="text-sm text-white">{e.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </SheetContent>
      </Sheet>
    </View>
  )
}

export default FingerPickerPage
```

- [ ] **Step 3: 验证编译**

```bash
pnpm validate
```

Expected: 无 TypeScript 错误

- [ ] **Step 4: 提交完整实现**

```bash
git add src/pages/finger-picker/index.tsx
git commit -m "feat(finger-picker): 实现手指选人页面（Canvas 触摸 + 4 种动画 + 设置面板）"
```

---

### Task 7: 端到端验证

- [ ] **Step 1: 启动 H5 开发服务器**

```bash
pnpm dev:web
```

Expected: 服务启动在 http://localhost:5000

- [ ] **Step 2: 验证工具箱入口**

打开 http://localhost:5000，进入工具箱页面，确认随机类出现"手指选人"卡片，点击可跳转到手指选人页面。

- [ ] **Step 3: 验证核心流程**

1. 进入页面：全屏深色背景，顶部显示"请将手指放在屏幕上"
2. 鼠标按下（模拟单指）：出现彩色光圈，提示变为"再放一根手指开始倒计时"
3. 再次按下（模拟双指，H5 可用 Chrome DevTools 多点触控）：开始 3 秒倒计时
4. 松开一根手指：倒计时重置
5. 保持 2 根手指 3 秒：触发动画，最终显示中奖者
6. 点击屏幕：重置

- [ ] **Step 4: 验证设置面板**

点击右上角齿轮图标，确认底部弹出设置面板，可切换模式/特效，关闭后重新进入页面设置保持。

- [ ] **Step 5: 最终提交**

```bash
git add docs/superpowers/plans/2026-05-18-finger-picker.md
git commit -m "docs: 手指选人实现计划"
```

- [ ] **Step 5: 提交**

```bash
git add src/pages/finger-picker/index.config.ts src/app.config.ts src/pages/tools/index.tsx
git commit -m "feat(finger-picker): 注册页面路由并添加工具箱入口"
```

---

### Task 2: 主页面骨架 + Canvas 初始化

**Files:**
- Create: `src/pages/finger-picker/index.tsx`

- [ ] **Step 1: 创建主页面骨架**

创建 `src/pages/finger-picker/index.tsx`，内容如下（第一部分，类型定义 + 常量）：

```typescript
import { View, Text, Canvas } from '@tarojs/components'
import Taro, { useReady } from '@tarojs/taro'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Settings } from 'lucide-react-taro'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import type { FC } from 'react'

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#a855f7', '#ec4899', '#f8fafc', '#fbbf24',
]

type AppState = 'idle' | 'waiting' | 'countdown' | 'animating' | 'result'
type EffectType = 'pulse' | 'scan' | 'explode' | 'ripple'
type ModeType = 'single' | 'multi' | 'group'

interface Particle {
  x: number; y: number; vx: number; vy: number
  alpha: number; radius: number; color: string
}

interface TouchPoint {
  id: number; x: number; y: number; color: string
  state: 'active' | 'winner' | 'eliminated'
  particles: Particle[]
  scale: number        // 呼吸动画缩放
  alpha: number        // 消除动画透明度
  pulsePhase: number   // 呼吸相位偏移
}

interface Settings {
  mode: ModeType
  count: number
  effect: EffectType
}

const DEFAULT_SETTINGS: Settings = { mode: 'single', count: 2, effect: 'pulse' }
const SETTINGS_KEY = 'fingerPickerSettings'
const COUNTDOWN_DURATION = 3000
```

- [ ] **Step 2: 添加组件主体（状态 + Canvas 初始化）**

在同一文件中继续追加（紧接上方内容）：

```typescript
const FingerPickerPage: FC = () => {
  const [appState, setAppState] = useState<AppState>('idle')
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [screenSize, setScreenSize] = useState({ width: 375, height: 667 })

  const ctxRef = useRef<any>(null)
  const touchPointsRef = useRef<Map<number, TouchPoint>>(new Map())
  const colorIndexRef = useRef(0)
  const appStateRef = useRef<AppState>('idle')
  const countdownStartRef = useRef<number>(0)
  const countdownValueRef = useRef(3)
  const rafRef = useRef<number>(0)
  const animStartRef = useRef<number>(0)
  const winnersRef = useRef<number[]>([])
  const scanAngleRef = useRef(0)
  const rippleWavesRef = useRef<{ r: number; alpha: number; color: string }[]>([])

  const updateAppState = (s: AppState) => {
    appStateRef.current = s
    setAppState(s)
  }

  useEffect(() => {
    const info = Taro.getSystemInfoSync()
    setScreenSize({ width: info.windowWidth, height: info.windowHeight })
    try {
      const saved = Taro.getStorageSync(SETTINGS_KEY)
      if (saved) setSettings(JSON.parse(saved))
    } catch { /* ignore */ }
    return () => { cancelAnimationFrame(rafRef.current) }
  }, [])

  useReady(() => {
    const query = Taro.createSelectorQuery()
    query.select('#fingerCanvas').fields({ node: true, size: true }).exec((res) => {
      if (res[0]?.node) {
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = Taro.getSystemInfoSync().pixelRatio
        const info = Taro.getSystemInfoSync()
        canvas.width = info.windowWidth * dpr
        canvas.height = info.windowHeight * dpr
        ctx.scale(dpr, dpr)
        ctxRef.current = ctx
        startRenderLoop()
      }
    })
  })
```

- [ ] **Step 3: 验证编译**

```bash
pnpm validate
```

Expected: 无 TypeScript 错误（此时页面尚未完整，可能有 startRenderLoop 未定义警告，后续任务补全）

---

### Task 3: 触摸事件处理 + 状态机

**Files:**
- Modify: `src/pages/finger-picker/index.tsx`

- [ ] **Step 1: 添加触摸事件处理函数**

在 `FingerPickerPage` 组件内，`useReady` 之后添加：

```typescript
  const assignColor = (): string => {
    const color = COLORS[colorIndexRef.current % COLORS.length]
    colorIndexRef.current++
    return color
  }

  const handleTouchStart = (e: any) => {
    if (appStateRef.current === 'animating' || appStateRef.current === 'result') return
    const touches = e.touches || e.changedTouches || []
    for (const t of touches) {
      if (!touchPointsRef.current.has(t.identifier)) {
        touchPointsRef.current.set(t.identifier, {
          id: t.identifier,
          x: t.clientX ?? t.pageX,
          y: t.clientY ?? t.pageY,
          color: assignColor(),
          state: 'active',
          particles: [],
          scale: 1,
          alpha: 1,
          pulsePhase: Math.random() * Math.PI * 2,
        })
      }
    }
    updateStateFromTouches()
  }

  const handleTouchMove = (e: any) => {
    if (appStateRef.current === 'animating' || appStateRef.current === 'result') return
    const touches = e.touches || e.changedTouches || []
    for (const t of touches) {
      const pt = touchPointsRef.current.get(t.identifier)
      if (pt) {
        pt.x = t.clientX ?? t.pageX
        pt.y = t.clientY ?? t.pageY
      }
    }
  }

  const handleTouchEnd = (e: any) => {
    if (appStateRef.current === 'animating') return
    if (appStateRef.current === 'result') {
      resetAll()
      return
    }
    const ended = e.changedTouches || []
    for (const t of ended) {
      touchPointsRef.current.delete(t.identifier)
    }
    colorIndexRef.current = 0
    touchPointsRef.current.forEach((pt) => {
      pt.color = COLORS[colorIndexRef.current % COLORS.length]
      colorIndexRef.current++
    })
    updateStateFromTouches()
  }

  const updateStateFromTouches = () => {
    const count = touchPointsRef.current.size
    if (count === 0) {
      updateAppState('idle')
      countdownStartRef.current = 0
    } else if (count === 1) {
      updateAppState('waiting')
      countdownStartRef.current = 0
    } else {
      if (appStateRef.current !== 'countdown') {
        countdownStartRef.current = Date.now()
        countdownValueRef.current = 3
      }
      updateAppState('countdown')
    }
  }

  const resetAll = () => {
    touchPointsRef.current.clear()
    colorIndexRef.current = 0
    winnersRef.current = []
    rippleWavesRef.current = []
    scanAngleRef.current = 0
    countdownStartRef.current = 0
    updateAppState('idle')
  }
```

- [ ] **Step 2: 验证编译**

```bash
pnpm validate
```

Expected: 无 TypeScript 错误

---

### Task 6: 设置面板 + 持久化 + JSX 渲染

**Files:**
- Modify: `src/pages/finger-picker/index.tsx`

- [ ] **Step 1: 添加 saveSettings 函数**

在 `finishAnimation` 之后添加：

```typescript
  const saveSettings = (s: Settings) => {
    setSettings(s)
    try { Taro.setStorageSync(SETTINGS_KEY, JSON.stringify(s)) } catch { /* ignore */ }
  }
```

- [ ] **Step 2: 添加 JSX return 语句（完整页面结构）**

在 `saveSettings` 之后添加 return 语句，关闭组件：

```typescript
  return (
    <View
      className="relative overflow-hidden"
      style={{ width: screenSize.width, height: screenSize.height, background: '#0a0a0f' }}
    >
      <Canvas
        type="2d"
        id="fingerCanvas"
        style={{ width: screenSize.width, height: screenSize.height, display: 'block' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* 右上角设置按钮 */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetTrigger
          className="absolute top-10 right-4 w-10 h-10 flex items-center justify-center rounded-full"
          style={{ background: 'rgba(255,255,255,0.12)' }}
        >
          <Settings size={20} color="#ffffff" />
        </SheetTrigger>
        <SheetContent side="bottom" className="bg-[#1a1a2e] border-t border-white/10 pb-10">
          <SheetHeader>
            <SheetTitle className="text-white">设置</SheetTitle>
          </SheetHeader>

          {/* 选人模式 */}
          <View className="mt-4">
            <Text className="text-sm text-gray-400 mb-2 block">选人模式</Text>
            <View className="flex flex-row gap-2">
              {(['single', 'multi', 'group'] as ModeType[]).map((m) => (
                <View
                  key={m}
                  className="flex-1 py-2 rounded-xl flex items-center justify-center"
                  style={{
                    background: settings.mode === m ? '#6366f1' : 'rgba(255,255,255,0.08)',
                    border: settings.mode === m ? '2px solid #6366f1' : '2px solid transparent',
                  }}
                  onClick={() => saveSettings({ ...settings, mode: m })}
                >
                  <Text className="text-sm text-white">
                    {m === 'single' ? '选1人' : m === 'multi' ? '选多人' : '分组'}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* 人数/组数步进器 */}
          {settings.mode !== 'single' && (
            <View className="mt-4 flex flex-row items-center justify-between">
              <Text className="text-sm text-gray-400">
                {settings.mode === 'multi' ? '选几人' : '分几组'}
              </Text>
              <View className="flex flex-row items-center gap-4">
                <View
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                  onClick={() => saveSettings({ ...settings, count: Math.max(2, settings.count - 1) })}
                >
                  <Text className="text-white text-lg">-</Text>
                </View>
                <Text className="text-white text-lg font-bold w-6 text-center">{settings.count}</Text>
                <View
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                  onClick={() => saveSettings({ ...settings, count: Math.min(9, settings.count + 1) })}
                >
                  <Text className="text-white text-lg">+</Text>
                </View>
              </View>
            </View>
          )}

          {/* 动画特效 */}
          <View className="mt-4">
            <Text className="text-sm text-gray-400 mb-2 block">动画特效</Text>
            <View className="flex flex-row flex-wrap gap-2">
              {([
                { key: 'pulse', label: '脉冲消除' },
                { key: 'scan', label: '扫描光束' },
                { key: 'explode', label: '粒子爆炸' },
                { key: 'ripple', label: '彩虹波纹' },
              ] as { key: EffectType; label: string }[]).map((e) => (
                <View
                  key={e.key}
                  className="px-4 py-2 rounded-xl"
                  style={{
                    background: settings.effect === e.key ? '#6366f1' : 'rgba(255,255,255,0.08)',
                    border: settings.effect === e.key ? '2px solid #6366f1' : '2px solid transparent',
                  }}
                  onClick={() => saveSettings({ ...settings, effect: e.key })}
                >
                  <Text className="text-sm text-white">{e.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </SheetContent>
      </Sheet>
    </View>
  )
}

export default FingerPickerPage
```

- [ ] **Step 3: 验证编译**

```bash
pnpm validate
```

Expected: 无 TypeScript 错误

- [ ] **Step 4: 提交完整实现**

```bash
git add src/pages/finger-picker/index.tsx
git commit -m "feat(finger-picker): 实现手指选人页面（Canvas 触摸 + 4 种动画 + 设置面板）"
```

---

### Task 7: 端到端验证

- [ ] **Step 1: 启动 H5 开发服务器**

```bash
pnpm dev:web
```

Expected: 服务启动在 http://localhost:5000

- [ ] **Step 2: 验证工具箱入口**

打开 http://localhost:5000，进入工具箱页面，确认随机类出现"手指选人"卡片，点击可跳转到手指选人页面。

- [ ] **Step 3: 验证核心流程**

1. 进入页面：全屏深色背景，顶部显示"请将手指放在屏幕上"
2. 鼠标按下（模拟单指）：出现彩色光圈，提示变为"再放一根手指开始倒计时"
3. 再次按下（模拟双指，H5 可用 Chrome DevTools 多点触控）：开始 3 秒倒计时
4. 松开一根手指：倒计时重置
5. 保持 2 根手指 3 秒：触发动画，最终显示中奖者
6. 点击屏幕：重置

- [ ] **Step 4: 验证设置面板**

点击右上角齿轮图标，确认底部弹出设置面板，可切换模式/特效，关闭后重新进入页面设置保持。

- [ ] **Step 5: 最终提交**

```bash
git add docs/superpowers/plans/2026-05-18-finger-picker.md
git commit -m "docs: 手指选人实现计划"
```

---

### Task 4: 渲染循环 + 触摸点绘制

**Files:**
- Modify: `src/pages/finger-picker/index.tsx`

- [ ] **Step 1: 添加渲染循环和触摸点绘制函数**

在 `resetAll` 函数之后添加：

```typescript
  const drawTouchPoint = useCallback((ctx: any, pt: TouchPoint, now: number) => {
    const { x, y, color, state, scale, alpha } = pt
    if (alpha <= 0) return
    const baseR = 48
    const r = baseR * scale

    ctx.save()
    ctx.globalAlpha = alpha

    // 外圈呼吸光晕
    const breathScale = state === 'active'
      ? 1 + 0.15 * Math.sin(now / 600 + pt.pulsePhase)
      : state === 'winner' ? 1.3 : 1
    const glowR = r * breathScale * 1.6
    const grad = ctx.createRadialGradient(x, y, r * 0.5, x, y, glowR)
    grad.addColorStop(0, color + '55')
    grad.addColorStop(1, color + '00')
    ctx.beginPath()
    ctx.arc(x, y, glowR, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.fill()

    // 主圆圈
    ctx.beginPath()
    ctx.arc(x, y, r * breathScale, 0, Math.PI * 2)
    ctx.strokeStyle = color
    ctx.lineWidth = state === 'winner' ? 4 : 2.5
    ctx.stroke()

    // 中心半透明填充
    ctx.beginPath()
    ctx.arc(x, y, r * breathScale * 0.6, 0, Math.PI * 2)
    ctx.fillStyle = color + (state === 'winner' ? 'cc' : '44')
    ctx.fill()

    ctx.restore()
  }, [])

  const drawParticles = useCallback((ctx: any, pt: TouchPoint) => {
    for (const p of pt.particles) {
      if (p.alpha <= 0) continue
      ctx.save()
      ctx.globalAlpha = p.alpha
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.fill()
      ctx.restore()
    }
  }, [])

  const drawCountdown = useCallback((ctx: any, value: number, w: number, h: number) => {
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.font = `bold ${Math.min(w, h) * 0.25}px sans-serif`
    ctx.fillText(String(value), w / 2, h / 2)
    ctx.restore()
  }, [])

  const drawHint = useCallback((ctx: any, text: string, w: number, h: number) => {
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = `16px sans-serif`
    ctx.fillText(text, w / 2, h * 0.12)
    ctx.restore()
  }, [])
```

- [ ] **Step 2: 添加主渲染循环**

紧接上方代码添加：

```typescript
  const startRenderLoop = useCallback(() => {
    const loop = (now: number) => {
      const ctx = ctxRef.current
      if (!ctx) { rafRef.current = requestAnimationFrame(loop); return }
      const { width: W, height: H } = screenSize
      const state = appStateRef.current

      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#0a0a0f'
      ctx.fillRect(0, 0, W, H)

      // 倒计时逻辑
      if (state === 'countdown') {
        const elapsed = Date.now() - countdownStartRef.current
        const remaining = Math.ceil((COUNTDOWN_DURATION - elapsed) / 1000)
        countdownValueRef.current = Math.max(1, remaining)
        if (elapsed >= COUNTDOWN_DURATION) {
          triggerAnimation()
        }
      }

      // 绘制触摸点
      touchPointsRef.current.forEach((pt) => {
        drawTouchPoint(ctx, pt, now)
        drawParticles(ctx, pt)
      })

      // 绘制倒计时
      if (state === 'countdown') {
        drawCountdown(ctx, countdownValueRef.current, W, H)
      }

      // 绘制提示文字
      if (state === 'idle') {
        drawHint(ctx, '请将手指放在屏幕上', W, H)
      } else if (state === 'waiting') {
        drawHint(ctx, '再放一根手指开始倒计时', W, H)
      } else if (state === 'result') {
        drawHint(ctx, '点击任意位置重新开始', W, H)
      }

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [drawTouchPoint, drawParticles, drawCountdown, drawHint, screenSize])
```

- [ ] **Step 3: 添加 triggerAnimation 占位（后续任务实现）**

```typescript
  const triggerAnimation = useCallback(() => {
    if (appStateRef.current === 'animating') return
    updateAppState('animating')
    animStartRef.current = Date.now()
    // 选出中奖者
    const pts = Array.from(touchPointsRef.current.values())
    const settingsNow = settings
    let winnerIds: number[] = []
    if (settingsNow.mode === 'single') {
      const w = pts[Math.floor(Math.random() * pts.length)]
      winnerIds = [w.id]
    } else if (settingsNow.mode === 'multi') {
      const n = Math.min(settingsNow.count, pts.length - 1)
      const shuffled = [...pts].sort(() => Math.random() - 0.5)
      winnerIds = shuffled.slice(0, n).map((p) => p.id)
    } else {
      // group: 分组，每组颜色相同
      const n = Math.max(2, Math.min(settingsNow.count, pts.length))
      const shuffled = [...pts].sort(() => Math.random() - 0.5)
      const groupColors = COLORS.slice(0, n)
      shuffled.forEach((pt, i) => {
        pt.color = groupColors[i % n]
      })
      winnerIds = pts.map((p) => p.id) // 分组模式全部保留
    }
    winnersRef.current = winnerIds
    pts.forEach((pt) => {
      pt.state = winnerIds.includes(pt.id) ? 'winner' : 'eliminated'
    })
    playEffect(settingsNow.effect)
  }, [settings])
```

- [ ] **Step 4: 验证编译**

```bash
pnpm validate
```

Expected: 无 TypeScript 错误

---

### Task 6: 设置面板 + 持久化 + JSX 渲染

**Files:**
- Modify: `src/pages/finger-picker/index.tsx`

- [ ] **Step 1: 添加 saveSettings 函数**

在 `finishAnimation` 之后添加：

```typescript
  const saveSettings = (s: Settings) => {
    setSettings(s)
    try { Taro.setStorageSync(SETTINGS_KEY, JSON.stringify(s)) } catch { /* ignore */ }
  }
```

- [ ] **Step 2: 添加 JSX return 语句（完整页面结构）**

在 `saveSettings` 之后添加 return 语句，关闭组件：

```typescript
  return (
    <View
      className="relative overflow-hidden"
      style={{ width: screenSize.width, height: screenSize.height, background: '#0a0a0f' }}
    >
      <Canvas
        type="2d"
        id="fingerCanvas"
        style={{ width: screenSize.width, height: screenSize.height, display: 'block' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* 右上角设置按钮 */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetTrigger
          className="absolute top-10 right-4 w-10 h-10 flex items-center justify-center rounded-full"
          style={{ background: 'rgba(255,255,255,0.12)' }}
        >
          <Settings size={20} color="#ffffff" />
        </SheetTrigger>
        <SheetContent side="bottom" className="bg-[#1a1a2e] border-t border-white/10 pb-10">
          <SheetHeader>
            <SheetTitle className="text-white">设置</SheetTitle>
          </SheetHeader>

          {/* 选人模式 */}
          <View className="mt-4">
            <Text className="text-sm text-gray-400 mb-2 block">选人模式</Text>
            <View className="flex flex-row gap-2">
              {(['single', 'multi', 'group'] as ModeType[]).map((m) => (
                <View
                  key={m}
                  className="flex-1 py-2 rounded-xl flex items-center justify-center"
                  style={{
                    background: settings.mode === m ? '#6366f1' : 'rgba(255,255,255,0.08)',
                    border: settings.mode === m ? '2px solid #6366f1' : '2px solid transparent',
                  }}
                  onClick={() => saveSettings({ ...settings, mode: m })}
                >
                  <Text className="text-sm text-white">
                    {m === 'single' ? '选1人' : m === 'multi' ? '选多人' : '分组'}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* 人数/组数步进器 */}
          {settings.mode !== 'single' && (
            <View className="mt-4 flex flex-row items-center justify-between">
              <Text className="text-sm text-gray-400">
                {settings.mode === 'multi' ? '选几人' : '分几组'}
              </Text>
              <View className="flex flex-row items-center gap-4">
                <View
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                  onClick={() => saveSettings({ ...settings, count: Math.max(2, settings.count - 1) })}
                >
                  <Text className="text-white text-lg">-</Text>
                </View>
                <Text className="text-white text-lg font-bold w-6 text-center">{settings.count}</Text>
                <View
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                  onClick={() => saveSettings({ ...settings, count: Math.min(9, settings.count + 1) })}
                >
                  <Text className="text-white text-lg">+</Text>
                </View>
              </View>
            </View>
          )}

          {/* 动画特效 */}
          <View className="mt-4">
            <Text className="text-sm text-gray-400 mb-2 block">动画特效</Text>
            <View className="flex flex-row flex-wrap gap-2">
              {([
                { key: 'pulse', label: '脉冲消除' },
                { key: 'scan', label: '扫描光束' },
                { key: 'explode', label: '粒子爆炸' },
                { key: 'ripple', label: '彩虹波纹' },
              ] as { key: EffectType; label: string }[]).map((e) => (
                <View
                  key={e.key}
                  className="px-4 py-2 rounded-xl"
                  style={{
                    background: settings.effect === e.key ? '#6366f1' : 'rgba(255,255,255,0.08)',
                    border: settings.effect === e.key ? '2px solid #6366f1' : '2px solid transparent',
                  }}
                  onClick={() => saveSettings({ ...settings, effect: e.key })}
                >
                  <Text className="text-sm text-white">{e.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </SheetContent>
      </Sheet>
    </View>
  )
}

export default FingerPickerPage
```

- [ ] **Step 3: 验证编译**

```bash
pnpm validate
```

Expected: 无 TypeScript 错误

- [ ] **Step 4: 提交完整实现**

```bash
git add src/pages/finger-picker/index.tsx
git commit -m "feat(finger-picker): 实现手指选人页面（Canvas 触摸 + 4 种动画 + 设置面板）"
```

---

### Task 7: 端到端验证

- [ ] **Step 1: 启动 H5 开发服务器**

```bash
pnpm dev:web
```

Expected: 服务启动在 http://localhost:5000

- [ ] **Step 2: 验证工具箱入口**

打开 http://localhost:5000，进入工具箱页面，确认随机类出现"手指选人"卡片，点击可跳转到手指选人页面。

- [ ] **Step 3: 验证核心流程**

1. 进入页面：全屏深色背景，顶部显示"请将手指放在屏幕上"
2. 鼠标按下（模拟单指）：出现彩色光圈，提示变为"再放一根手指开始倒计时"
3. 再次按下（模拟双指，H5 可用 Chrome DevTools 多点触控）：开始 3 秒倒计时
4. 松开一根手指：倒计时重置
5. 保持 2 根手指 3 秒：触发动画，最终显示中奖者
6. 点击屏幕：重置

- [ ] **Step 4: 验证设置面板**

点击右上角齿轮图标，确认底部弹出设置面板，可切换模式/特效，关闭后重新进入页面设置保持。

- [ ] **Step 5: 最终提交**

```bash
git add docs/superpowers/plans/2026-05-18-finger-picker.md
git commit -m "docs: 手指选人实现计划"
```
