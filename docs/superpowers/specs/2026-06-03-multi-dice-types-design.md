# 多骰子类型支持设计文档

## 概述

扩展骰子工具，从仅支持 D6 到支持 D4、D6、D8、D12、D20 五种标准 RPG 骰子类型。采用骰子工厂模式，每种骰子独立模块，通过统一接口创建几何体、物理碰撞体和纹理。

## 决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| D10 处理 | 不实现 | 非正多面体，几何和物理复杂度高，用户选择跳过 |
| 纹理风格 | D6 圆点 + 其他数字 | RPG 骰子标准做法，小面上数字比圆点更清晰 |
| 架构模式 | 骰子工厂 + 模块化文件 | 职责清晰，新增骰子类型只需加文件 |
| 类型传递 | PhysicsDice 新增 diceType prop | 架构清晰，父组件控制 |

## 架构

### 文件结构

```
src/lib/three/dice/
  ├── types.ts          # DiceType, DiceColor, DiceTheme, DiceDefinition 接口
  ├── index.ts          # DiceFactory: getDiceDefinition(type) 统一入口
  ├── textures.ts       # generateDiceTexture (D6 圆点) + generateNumberTexture (数字) + 点阵字体数据
  ├── d6.ts             # D6: RoundedBoxGeometry + Box 碰撞体 + 圆点纹理
  ├── d4.ts             # D4: TetrahedronGeometry + ConvexPolyhedron + 数字纹理
  ├── d8.ts             # D8: OctahedronGeometry + ConvexPolyhedron + 数字纹理
  ├── d12.ts            # D12: DodecahedronGeometry + ConvexPolyhedron + 数字纹理
  └── d20.ts            # D20: IcosahedronGeometry + ConvexPolyhedron + 数字纹理

src/lib/physics/
  ├── dice-body.ts      # 扩展: 根据 DiceType 创建不同碰撞体
  └── utils.ts          # 扩展: 通用 getTopFace() 替代 getTopFaceD6()
```

### 接口定义

```typescript
// types.ts
type DiceType = 'D4' | 'D6' | 'D8' | 'D12' | 'D20'

interface DiceDefinition {
  createMesh(color: DiceColor): THREE.Mesh
  createBody(): CANNON.Body
  faceNormals: CANNON.Vec3[]
  getFaceValue(faceIndex: number): number
  dispose(mesh: THREE.Mesh): void
}
```

### 各骰子几何参数

| 骰子 | Three.js 几何体 | Cannon.js 碰撞体 | 面数 | 尺寸 |
|------|----------------|------------------|------|------|
| D4 | TetrahedronGeometry(0.7, 0) | ConvexPolyhedron (4顶点) | 4 | 0.7 |
| D6 | RoundedBoxGeometry(1,1,1,4,0.15) | Box (半尺寸0.5) | 6 | 1.0 |
| D8 | OctahedronGeometry(0.7, 0) | ConvexPolyhedron (6顶点) | 8 | 0.7 |
| D12 | DodecahedronGeometry(0.7, 0) | ConvexPolyhedron (20顶点) | 12 | 0.7 |
| D20 | IcosahedronGeometry(0.7, 0) | ConvexPolyhedron (12顶点) | 20 | 0.7 |

### 纹理系统

- **D6**: 保持现有 `generateDiceTexture` 圆点图案
- **D4/D8/D12/D20**: 新增 `generateNumberTexture(faceValue, bgColor, dotColor)`
  - 256×256 RGBA DataTexture
  - 5×7 像素点阵字体绘制 0-9 数字
  - 纯数组运算，不依赖 DOM/Canvas API，跨端兼容
  - 同颜色同类型骰子共享 Material

### 面检测算法

通用 `getTopFace(faceNormals, body)` 函数：
- 对每个面法向量与世界 Y 轴做点积
- 取最大值的面索引
- 通过 `getFaceValue(faceIndex)` 映射到实际点数

各骰子面法向量来源：
- D4: 从正四面体顶点计算 4 个面法向量
- D6: ±x, ±y, ±z 六个方向（保持现有）
- D8: 正八面体 8 个面法向量
- D12: 从 DodecahedronGeometry 提取 12 个面法向量
- D20: 从 IcosahedronGeometry 提取 20 个面法向量

### 组件改动

**PhysicsDice 组件**：
1. 新增 `diceType: DiceType` prop
2. `throwDice` 根据 diceType 调用工厂方法
3. `initStaticDice` 根据 diceType 创建静态骰子
4. 结果检测改用通用 `getTopFace` + `getFaceValue`

**DicePage 组件**：
1. `DICE_TYPES` 移除 D10
2. `selectedDice.key` 作为 `diceType` 传给 PhysicsDice
3. 结果展示用 `selectedDice.max` 替代硬编码

### 清理逻辑

`cleanupBodies` 和 `cleanup` 保持不变（操作 Mesh/Body，与类型无关）。`disposeD6Dice` 改为通用 `disposeDice`，根据材质类型做相同 dispose。

## 风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| D4 四面体朝上面判定 | D4 读数方式与其他骰子不同 | 采用"朝上面"读数，与其他骰子一致 |
| ConvexPolyhedron 碰撞精度 | 非凸形状可能导致穿透 | cannon-es 的 ConvexPolyhedron 对凸多面体足够 |
| 小程序 WebGL 性能 | D20 面数多，纹理生成慢 | 纹理缓存，同一颜色只生成一次 |
| 点阵字体可读性 | 5×7 像素数字较小 | D4/D8 用大字号，D20 用标准字号 |
