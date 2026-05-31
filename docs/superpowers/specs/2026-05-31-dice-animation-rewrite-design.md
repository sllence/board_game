# D6 骰子动画全特效重写 - 技术规格

> 日期: 2026-05-31  
> 状态: 已批准

## 概述

重写骰子动画系统，使用 Three.js WebGL 替换现有 Canvas 2D 软件渲染，实现全套粒子特效、动态阴影、景深模糊和自适应性能降级。

## 决策记录

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 骰子类型 | 仅 D6 | 专注质量，简化物理建模 |
| 渲染引擎 | Three.js WebGL | GPU 加速，内置特效系统 |
| 视觉特效 | 全套 | 粒子轨迹 + 落地火花 + 结果光效 + 环境粒子 |
| 性能策略 | 自适应 60fps | 高端机全套特效，低端机自动降级 |

## 架构设计

### 目录结构

```
src/lib/physics/          # 保留 - Cannon.js 物理引擎
├── dice-body.ts          # D6 刚体（保留，可能微调）
├── world.ts              # 物理世界（保留）
├── table-plane.ts        # 桌面碰撞体（保留）
└── utils.ts              # 物理工具函数（保留）

src/lib/three/            # 新增 - Three.js 渲染引擎
├── dice.ts               # D6 几何体 + 材质
├── particles.ts          # 粒子系统
├── postprocessing.ts     # 景深 + 抗锯齿 + 辉光
├── performance.ts        # 设备性能检测 + 自适应降级
└── lighting.ts           # 光照系统

src/pages/dice/components/
├── PhysicsDice.tsx       # 重写 - 替换 Canvas 为 Three.js
└── DicePage.tsx          # 保留 - UI 逻辑
```

### 数据流

```
用户点击投掷
    ↓
DicePage.tsx (UI 逻辑)
    ↓
PhysicsDice.tsx (React 组件)
    ├→ Cannon.js (物理模拟)
    │   ├→ createD6Body() × N
    │   ├→ applyThrowForce() × N
    │   └→ world.step() 循环
    │
    └→ Three.js (渲染循环)
        ├→ 更新骰子位置/旋转
        ├→ 更新粒子系统
        ├→ 渲染场景
        └→ 后处理效果
```

## 详细设计

### 1. D6 几何体与材质 (`src/lib/three/dice.ts`)

**几何体**
- `BoxGeometry(1, 1, 1)` 作为基础形状
- 使用 `BufferGeometry` 手动创建圆角效果（可选优化）

**纹理生成**
- 使用 `CanvasTexture` 动态生成骰子面纹理
- 每个面独立绘制 1-6 圆点
- 圆点布局：
  ```
  1: 中心  2: 对角  3: 对角+中心
  4: 四角  5: 四角+中心  6: 三列
  ```

**材质**
```typescript
const diceMaterial = new THREE.MeshStandardMaterial({
  map: diceTexture,           // 纹理贴图
  roughness: 0.3,             // 低粗糙度，有光泽
  metalness: 0.1,             // 轻微金属质感
  envMapIntensity: 0.5,       // 环境反射强度
})
```

### 2. 粒子系统 (`src/lib/three/particles.ts`)

#### 2.1 投掷轨迹粒子
- **触发**: 骰子飞行时
- **实现**: `THREE.Points` + `THREE.BufferGeometry`
- **参数**:
  - 数量: 每帧 5-10 个粒子
  - 生命周期: 0.5-1.0 秒
  - 颜色: 金色 → 透明渐变
  - 大小: 0.02-0.05

#### 2.2 落地火花粒子
- **触发**: 骰子碰撞桌面时
- **实现**: 自定义 `THREE.ShaderMaterial`
- **参数**:
  - 数量: 每次碰撞 20-30 个粒子
  - 生命周期: 0.3-0.5 秒
  - 颜色: 橙色 → 红色渐变
  - 初速度: 随机方向，1-3 m/s

#### 2.3 结果光效
- **触发**: 骰子停止后
- **实现**: `THREE.Sprite` + `THREE.SpriteMaterial`
- **参数**:
  - 大小: 缓慢放大 0.5 → 1.0
  - 颜色: 柔和黄色
  - 透明度: 0 → 0.6

#### 2.4 环境微光粒子
- **触发**: 始终存在
- **实现**: `THREE.Points` + `THREE.BufferGeometry`
- **参数**:
  - 数量: 50-100 个
  - 运动: 缓慢漂浮
  - 颜色: 白色/淡黄色
  - 大小: 0.01-0.03

### 3. 光照系统 (`src/lib/three/lighting.ts`)

```typescript
// 主光源 - 投射阴影
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
directionalLight.position.set(5, 10, 5)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.width = 1024
directionalLight.shadow.mapSize.height = 1024
directionalLight.shadow.camera.near = 0.5
directionalLight.shadow.camera.far = 50

// 环境光 - 补充暗部
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)

// 点光源 - 粒子照明
const pointLight = new THREE.PointLight(0xF59E0B, 0.5, 10)
```

### 4. 后处理 (`src/lib/three/postprocessing.ts`)

```typescript
// 景深模糊
const bokehPass = new THREE.BokehPass(scene, camera, {
  focus: 10,        // 焦点距离
  aperture: 0.02,   // 光圈大小
  maxblur: 0.005,   // 最大模糊量
})

// 抗锯齿
const fxaaPass = new THREE.FXAAScreenShader()

// 辉光效果
const bloomPass = new THREE.UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.5,  // 强度
  0.4,  // 半径
  0.85  // 阈值
)
```

### 5. 自适应性能降级 (`src/lib/three/performance.ts`)

**性能检测指标**
- FPS 监测: 最近 60 帧平均值
- GPU 能力: WebGL 扩展检测
- 设备像素比: `window.devicePixelRatio`
- 内存使用: `performance.memory.usedJSHeapSize`（Chrome）

**降级策略**

| 性能等级 | FPS 阈值 | 特效配置 |
|----------|----------|----------|
| 高端 | ≥55 | 全套: 景深 + 辉光 + 全粒子 + 阴影 |
| 中端 | 30-54 | 核心: 粒子 + 阴影，无景深/辉光 |
| 低端 | <30 | 轻量: 仅基础粒子，无阴影 |

**动态调整**
```typescript
// 每 2 秒评估一次性能
if (averageFPS < 30) {
  downgradeEffects()      // 降级特效
} else if (averageFPS > 55 && canUpgrade) {
  upgradeEffects()        // 升级特效
}
```

## 粒子特效详细规格

### 投掷轨迹

```
颜色: #FFD700 (金色) → #FF8C00 (橙色) → 透明
大小: 0.03 → 0.01 (逐渐缩小)
数量: 每帧 8 个
生命周期: 0.8 秒
发射器: 跟随骰子位置
混合模式: AdditiveBlending
```

### 落地火花

```
颜色: #FF4500 (橙红) → #FF0000 (红) → 透明
大小: 0.02 → 0.05 (先变大后缩小)
数量: 每次碰撞 25 个
生命周期: 0.4 秒
发射方向: 随机半球，向上为主
初速度: 2-4 m/s
重力影响: 有
```

### 结果光效

```
颜色: #FFD700 (金色)
大小: 0.3 → 1.0 (缓慢放大)
持续时间: 1.5 秒
透明度: 0 → 0.7 → 0
位置: 骰子中心上方
纹理: 径向渐变圆形
```

### 环境微光

```
颜色: #FFFFCC (淡黄) / #FFFFFF (白色)
大小: 0.02 (固定)
数量: 80 个
运动: 缓慢正弦波漂浮
分布: 场景周围随机分布
透明度: 0.3-0.6 (随机)
```

## 技术依赖

### 新增依赖

```json
{
  "three": "^0.170.0",
  "@types/three": "^0.170.0",
  "@types/node": "^22.0.0"
}
```

### 保留依赖

```json
{
  "cannon-es": "^0.20.0"  // 物理引擎
}
```

## 性能目标

| 指标 | 高端机 | 中端机 | 低端机 |
|------|--------|--------|--------|
| FPS | ≥55 | ≥30 | ≥30 |
| 粒子数量 | 80+25×N | 40+15×N | 20 |
| 阴影 | 有 | 有 | 无 |
| 后处理 | 全部 | 无 | 无 |
| 内存增量 | ≤50MB | ≤30MB | ≤15MB |

## 文件变更清单

### 新增文件

1. `src/lib/three/dice.ts` - D6 几何体、材质、纹理
2. `src/lib/three/particles.ts` - 四种粒子系统
3. `src/lib/three/postprocessing.ts` - 景深、抗锯齿、辉光
4. `src/lib/three/performance.ts` - 性能检测与降级
5. `src/lib/three/lighting.ts` - 光照配置

### 重写文件

6. `src/pages/dice/components/PhysicsDice.tsx` - Canvas → Three.js

### 修改文件

7. `src/pages/dice/index.tsx` - 适配新组件接口（如有变化）
8. `package.json` - 添加 three 依赖

### 保留文件

- `src/lib/physics/*` - 物理引擎层完全保留

## 验收标准

1. 骰子投掷动画流畅，60fps 稳定（高端机）
2. 四种粒子效果正常工作
3. 阴影正确投射在桌面上
4. 景深效果使背景自然模糊
5. 低端机自动降级，无卡顿
6. 内存占用在合理范围内

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Three.js 体积过大 | 包体积增加 | 使用 tree-shaking，按需导入 |
| WebGL 兼容性 | 部分设备无法运行 | 降级到 Canvas 2D 方案（保留现有 PhysicsDice.tsx 作为回退） |
| 性能不达标 | 用户体验差 | 自适应降级策略 |
| 内存泄漏 | 崩溃 | 正确 dispose 资源 |

## 后续扩展

完成 D6 后可扩展：
1. 添加 D4/D8/D10/D12/D20 几何体
2. 支持自定义骰子外观
3. 添加音效同步
4. 支持多人同时投掷
