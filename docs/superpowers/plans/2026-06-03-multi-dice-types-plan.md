# 多骰子类型支持实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 扩展骰子工具支持 D4/D6/D8/D12/D20 五种标准 RPG 骰子

**Architecture:** 骰子工厂模式，每种骰子独立模块（geometry + physics + texture），通过统一 DiceDefinition 接口创建。PhysicsDice 组件新增 diceType prop。

**Tech Stack:** three-platformize, cannon-es, React (Taro)

---

### Task 1: 创建 types.ts — 骰子类型接口定义

**Files:**
- Create: `src/lib/three/dice/types.ts`

- [ ] **Step 1: 创建 types.ts**

```typescript
import * as THREE from 'three-platformize'
import * as CANNON from 'cannon-es'

export type DiceType = 'D4' | 'D6' | 'D8' | 'D12' | 'D20'

export interface DiceColor {
  key: string
  label: string
  bgColor: [number, number, number]
  dotColor: [number, number, number]
}

export interface DiceTheme {
  key: string
  label: string
  pageBg: string
  sceneBg: number
  groundColor: number
  textColor: string
  subTextColor: string
}

export interface DiceDefinition {
  createMesh(color: DiceColor): THREE.Mesh
  createBody(): CANNON.Body
  faceNormals: CANNON.Vec3[]
  getFaceValue(faceIndex: number): number
  dispose(mesh: THREE.Mesh): void
}

export const DICE_COLORS: DiceColor[] = [
  { key: 'white', label: '白色', bgColor: [0xFF, 0xFF, 0xFF], dotColor: [0x1A, 0x1A, 0x1A] },
  { key: 'black', label: '黑色', bgColor: [0x1A, 0x1A, 0x1A], dotColor: [0xFF, 0xFF, 0xFF] },
  { key: 'red', label: '红色', bgColor: [0xDC, 0x26, 0x26], dotColor: [0xFF, 0xFF, 0xFF] },
  { key: 'blue', label: '蓝色', bgColor: [0x25, 0x63, 0xEB], dotColor: [0xFF, 0xFF, 0xFF] },
  { key: 'green', label: '绿色', bgColor: [0x16, 0xA3, 0x4A], dotColor: [0xFF, 0xFF, 0xFF] },
  { key: 'purple', label: '紫色', bgColor: [0x93, 0x33, 0xEA], dotColor: [0xFF, 0xFF, 0xFF] },
]

export const DICE_THEMES: DiceTheme[] = [
  { key: 'white', label: '白色', pageBg: '#E8E8E8', sceneBg: 0xE8E8E8, groundColor: 0xE8E8E8, textColor: '#1A1A1A', subTextColor: '#6B7280' },
  { key: 'black', label: '黑色', pageBg: '#1A1A2E', sceneBg: 0x1A1A2E, groundColor: 0x1A1A2E, textColor: '#FFFFFF', subTextColor: '#9CA3AF' },
  { key: 'red', label: '红色', pageBg: '#2D1A1A', sceneBg: 0x2D1A1A, groundColor: 0x2D1A1A, textColor: '#FFFFFF', subTextColor: '#9CA3AF' },
  { key: 'blue', label: '蓝色', pageBg: '#1A1A3D', sceneBg: 0x1A1A3D, groundColor: 0x1A1A3D, textColor: '#FFFFFF', subTextColor: '#9CA3AF' },
  { key: 'green', label: '绿色', pageBg: '#1A2D1A', sceneBg: 0x1A2D1A, groundColor: 0x1A2D1A, textColor: '#FFFFFF', subTextColor: '#9CA3AF' },
  { key: 'purple', label: '紫色', pageBg: '#2D1A2E', sceneBg: 0x2D1A2E, groundColor: 0x2D1A2E, textColor: '#FFFFFF', subTextColor: '#9CA3AF' },
]
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/three/dice/types.ts
git commit -m "feat: add dice type interfaces and color/theme constants"
```

---

### Task 2: 创建 textures.ts — 点阵字体 + 纹理生成

**Files:**
- Create: `src/lib/three/dice/textures.ts`

- [ ] **Step 1: 创建 textures.ts**

包含：
1. 5×7 像素点阵字体数据（0-9 数字）
2. `generateNumberTexture(faceValue, bgColor, dotColor)` — 数字纹理
3. `generateDiceTexture(faceValue, bgColor, dotColor)` — D6 圆点纹理（从现有 dice.ts 迁移）
4. `TEX_SIZE = 256` 常量

```typescript
import * as THREE from 'three-platformize'

const TEX_SIZE = 256

// 5x7 像素点阵字体 - 每个数字用 5列 x 7行 的二进制矩阵表示
const FONT_5x7: Record<number, number[]> = {
  1: [0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E], // 1
  2: [0x0E, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1F], // 2
  3: [0x0E, 0x11, 0x01, 0x06, 0x01, 0x11, 0x0E], // 3
  4: [0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02], // 4
  5: [0x1F, 0x10, 0x1E, 0x01, 0x01, 0x11, 0x0E], // 5
  6: [0x06, 0x08, 0x10, 0x1E, 0x11, 0x11, 0x0E], // 6
  7: [0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08], // 7
  8: [0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E], // 8
  9: [0x0E, 0x11, 0x11, 0x0F, 0x01, 0x02, 0x0C], // 9
  0: [0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E], // 0
}

// D6 圆点位置定义
const D6_DOTS: Record<number, number[][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
}

export function generateDiceTexture(
  faceValue: number,
  bgColor: [number, number, number],
  dotColor: [number, number, number]
): THREE.Texture {
  const data = new Uint8Array(TEX_SIZE * TEX_SIZE * 4)
  const dots = D6_DOTS[faceValue] || []
  const radius = 20

  for (let y = 0; y < TEX_SIZE; y++) {
    for (let x = 0; x < TEX_SIZE; x++) {
      const i = (y * TEX_SIZE + x) * 4
      let isDot = false
      for (const [px, py] of dots) {
        const cx = (px / 100) * TEX_SIZE
        const cy = (py / 100) * TEX_SIZE
        if ((x - cx) ** 2 + (y - cy) ** 2 <= radius * radius) {
          isDot = true
          break
        }
      }
      if (isDot) {
        data[i] = dotColor[0]
        data[i + 1] = dotColor[1]
        data[i + 2] = dotColor[2]
        data[i + 3] = 255
      } else {
        data[i] = bgColor[0]
        data[i + 1] = bgColor[1]
        data[i + 2] = bgColor[2]
        data[i + 3] = 255
      }
    }
  }

  const texture = new THREE.DataTexture(data, TEX_SIZE, TEX_SIZE, THREE.RGBAFormat)
  texture.needsUpdate = true
  return texture
}

export function generateNumberTexture(
  faceValue: number,
  bgColor: [number, number, number],
  dotColor: [number, number, number]
): THREE.Texture {
  const data = new Uint8Array(TEX_SIZE * TEX_SIZE * 4)

  // 先填充背景色
  for (let i = 0; i < TEX_SIZE * TEX_SIZE; i++) {
    data[i * 4] = bgColor[0]
    data[i * 4 + 1] = bgColor[1]
    data[i * 4 + 2] = bgColor[2]
    data[i * 4 + 3] = 255
  }

  // 获取数字的点阵数据
  const digits = faceValue >= 10
    ? [Math.floor(faceValue / 10), faceValue % 10]
    : [faceValue]

  const charWidth = 5
  const charHeight = 7
  const pixelSize = 6 // 每个字体像素放大为 6x6
  const totalWidth = digits.length * (charWidth + 1) * pixelSize
  const startX = Math.floor((TEX_SIZE - totalWidth) / 2)
  const startY = Math.floor((TEX_SIZE - charHeight * pixelSize) / 2)

  for (let d = 0; d < digits.length; d++) {
    const charData = FONT_5x7[digits[d]]
    if (!charData) continue

    const offsetX = startX + d * (charWidth + 1) * pixelSize

    for (let row = 0; row < charHeight; row++) {
      const rowBits = charData[row]
      for (let col = 0; col < charWidth; col++) {
        if (rowBits & (1 << (4 - col))) {
          // 绘制像素块
          for (let py = 0; py < pixelSize; py++) {
            for (let px = 0; px < pixelSize; px++) {
              const x = offsetX + col * pixelSize + px
              const y = startY + row * pixelSize + py
              if (x < TEX_SIZE && y < TEX_SIZE) {
                const i = (y * TEX_SIZE + x) * 4
                data[i] = dotColor[0]
                data[i + 1] = dotColor[1]
                data[i + 2] = dotColor[2]
                data[i + 3] = 255
              }
            }
          }
        }
      }
    }
  }

  const texture = new THREE.DataTexture(data, TEX_SIZE, TEX_SIZE, THREE.RGBAFormat)
  texture.needsUpdate = true
  return texture
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/three/dice/textures.ts
git commit -m "feat: add dot-matrix font and number/dot texture generators"
```

---

### Task 3: 重构 d6.ts — 迁移现有 D6 逻辑

**Files:**
- Create: `src/lib/three/dice/d6.ts`
- Modify: `src/lib/three/dice.ts` (保留作为向后兼容 re-export)

- [ ] **Step 1: 创建 d6.ts**

从现有 `dice.ts` 迁移 D6 逻辑，使用 types.ts 的接口和 textures.ts 的纹理函数：

```typescript
import * as THREE from 'three-platformize'
import { RoundedBoxGeometry } from 'three-platformize/examples/jsm/geometries/RoundedBoxGeometry.js'
import * as CANNON from 'cannon-es'
import type { DiceColor, DiceDefinition } from './types'
import { generateDiceTexture } from './textures'
import { physicsWorld } from '@/lib/physics/world'

const D6_SIZE = 1.0

// BoxGeometry face order: +x, -x, +y, -y, +z, -z
// D6 face mapping: right(3), left(4), top(2), bottom(5), front(1), back(6)
const D6_FACE_VALUES = [3, 4, 2, 5, 1, 6]

export const D6_FACE_NORMALS = [
  new CANNON.Vec3(0, 0, 1),   // 正面 (1)
  new CANNON.Vec3(0, 1, 0),   // 顶面 (2)
  new CANNON.Vec3(1, 0, 0),   // 右面 (3)
  new CANNON.Vec3(-1, 0, 0),  // 左面 (4)
  new CANNON.Vec3(0, -1, 0),  // 底面 (5)
  new CANNON.Vec3(0, 0, -1),  // 背面 (6)
]

export const D6Definition: DiceDefinition = {
  createMesh(color: DiceColor): THREE.Mesh {
    const geometry = new RoundedBoxGeometry(D6_SIZE, D6_SIZE, D6_SIZE, 4, 0.15)
    const materials = D6_FACE_VALUES.map((faceValue) => {
      const texture = generateDiceTexture(faceValue, color.bgColor, color.dotColor)
      return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.3,
        metalness: 0.1,
        envMapIntensity: 0.5,
      })
    })
    const dice = new THREE.Mesh(geometry, materials)
    dice.castShadow = true
    dice.receiveShadow = true
    return dice
  },

  createBody(): CANNON.Body {
    const shape = new CANNON.Box(new CANNON.Vec3(D6_SIZE / 2, D6_SIZE / 2, D6_SIZE / 2))
    const body = new CANNON.Body({
      mass: 1,
      material: physicsWorld.materials.dice,
    })
    body.addShape(shape)
    body.linearDamping = 0.3
    body.angularDamping = 0.4
    body.allowSleep = true
    body.sleepSpeedLimit = 0.1
    body.sleepTimeLimit = 0.5
    return body
  },

  faceNormals: D6_FACE_NORMALS,

  getFaceValue(faceIndex: number): number {
    return faceIndex + 1 // D6: 面索引 0-5 → 点数 1-6
  },

  dispose(mesh: THREE.Mesh): void {
    mesh.geometry.dispose()
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((m) => {
        if (m instanceof THREE.MeshStandardMaterial) {
          m.map?.dispose()
        }
        m.dispose()
      })
    }
  },
}
```

- [ ] **Step 2: 更新 dice.ts 为 re-export**

将 `src/lib/three/dice.ts` 改为从新模块 re-export，保持向后兼容：

```typescript
// Re-export from new modular structure for backward compatibility
export { D6Definition as createD6Dice } from './dice/d6'
export { D6Definition } from './dice/d6'
export type { DiceColor, DiceTheme, DiceType, DiceDefinition } from './dice/types'
export { DICE_COLORS, DICE_THEMES } from './dice/types'

// Legacy function compatibility
import { D6Definition } from './dice/d6'
import type { DiceColor } from './dice/types'
import type * as THREE from 'three-platformize'

export function createD6DiceFunc(color: DiceColor = { key: 'white', label: '白色', bgColor: [0xFF, 0xFF, 0xFF], dotColor: [0x1A, 0x1A, 0x1A] }): THREE.Mesh {
  return D6Definition.createMesh(color)
}

export function disposeD6Dice(dice: THREE.Mesh): void {
  D6Definition.dispose(dice)
}

export function updateDiceTransform(
  dice: THREE.Mesh,
  position: { x: number; y: number; z: number },
  quaternion: { x: number; y: number; z: number; w: number }
): void {
  dice.position.set(position.x, position.y, position.z)
  dice.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/three/dice/d6.ts src/lib/three/dice.ts
git commit -m "refactor: extract D6 logic to dice/d6.ts, keep backward compat"
```

---

### Task 4: 创建 d4.ts — 四面体骰子

**Files:**
- Create: `src/lib/three/dice/d4.ts`

- [ ] **Step 1: 创建 d4.ts**

```typescript
import * as THREE from 'three-platformize'
import * as CANNON from 'cannon-es'
import type { DiceColor, DiceDefinition } from './types'
import { generateNumberTexture } from './textures'
import { physicsWorld } from '@/lib/physics/world'

const D4_SIZE = 0.7

// 正四面体 4 个顶点
const TETRA_VERTICES = [
  new CANNON.Vec3(1, 1, 1),
  new CANNON.Vec3(1, -1, -1),
  new CANNON.Vec3(-1, 1, -1),
  new CANNON.Vec3(-1, -1, 1),
]

// 正四面体 4 个面（顶点索引，逆时针）
const TETRA_FACES = [
  [0, 2, 1],
  [0, 1, 3],
  [0, 3, 2],
  [1, 2, 3],
]

// 计算面法向量
function computeFaceNormal(va: CANNON.Vec3, vb: CANNON.Vec3, vc: CANNON.Vec3): CANNON.Vec3 {
  const ab = new CANNON.Vec3()
  const ac = new CANNON.Vec3()
  va.vsub(vb, ab)
  va.vsub(vc, ac)
  const normal = new CANNON.Vec3()
  ab.cross(ac, normal)
  normal.normalize()
  return normal
}

const D4_NORMALS = TETRA_FACES.map((face) =>
  computeFaceNormal(TETRA_VERTICES[face[0]], TETRA_VERTICES[face[1]], TETRA_VERTICES[face[2]])
)

export const D4Definition: DiceDefinition = {
  createMesh(color: DiceColor): THREE.Mesh {
    const geometry = new THREE.TetrahedronGeometry(D4_SIZE, 0)
    const materials = [1, 2, 3, 4].map((faceValue) => {
      const texture = generateNumberTexture(faceValue, color.bgColor, color.dotColor)
      return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.3,
        metalness: 0.1,
        envMapIntensity: 0.5,
      })
    })
    const dice = new THREE.Mesh(geometry, materials)
    dice.castShadow = true
    dice.receiveShadow = true
    return dice
  },

  createBody(): CANNON.Body {
    const body = new CANNON.Body({
      mass: 1,
      material: physicsWorld.materials.dice,
    })
    const shape = new CANNON.ConvexPolyhedron({
      vertices: TETRA_VERTICES,
      faces: TETRA_FACES,
    })
    body.addShape(shape)
    body.linearDamping = 0.3
    body.angularDamping = 0.4
    body.allowSleep = true
    body.sleepSpeedLimit = 0.1
    body.sleepTimeLimit = 0.5
    return body
  },

  faceNormals: D4_NORMALS,

  getFaceValue(faceIndex: number): number {
    return faceIndex + 1
  },

  dispose(mesh: THREE.Mesh): void {
    mesh.geometry.dispose()
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((m) => {
        if (m instanceof THREE.MeshStandardMaterial) m.map?.dispose()
        m.dispose()
      })
    }
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/three/dice/d4.ts
git commit -m "feat: add D4 tetrahedron dice definition"
```

---

### Task 5: 创建 d8.ts — 八面体骰子

**Files:**
- Create: `src/lib/three/dice/d8.ts`

- [ ] **Step 1: 创建 d8.ts**

```typescript
import * as THREE from 'three-platformize'
import * as CANNON from 'cannon-es'
import type { DiceColor, DiceDefinition } from './types'
import { generateNumberTexture } from './textures'
import { physicsWorld } from '@/lib/physics/world'

const D8_SIZE = 0.7

// 正八面体 6 个顶点
const OCTA_VERTICES = [
  new CANNON.Vec3(1, 0, 0),
  new CANNON.Vec3(-1, 0, 0),
  new CANNON.Vec3(0, 1, 0),
  new CANNON.Vec3(0, -1, 0),
  new CANNON.Vec3(0, 0, 1),
  new CANNON.Vec3(0, 0, -1),
]

// 正八面体 8 个面
const OCTA_FACES = [
  [0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2],
  [1, 4, 2], [1, 3, 4], [1, 5, 3], [1, 2, 5],
]

function computeFaceNormal(va: CANNON.Vec3, vb: CANNON.Vec3, vc: CANNON.Vec3): CANNON.Vec3 {
  const ab = new CANNON.Vec3()
  const ac = new CANNON.Vec3()
  va.vsub(vb, ab)
  va.vsub(vc, ac)
  const normal = new CANNON.Vec3()
  ab.cross(ac, normal)
  normal.normalize()
  return normal
}

const D8_NORMALS = OCTA_FACES.map((face) =>
  computeFaceNormal(OCTA_VERTICES[face[0]], OCTA_VERTICES[face[1]], OCTA_VERTICES[face[2]])
)

export const D8Definition: DiceDefinition = {
  createMesh(color: DiceColor): THREE.Mesh {
    const geometry = new THREE.OctahedronGeometry(D8_SIZE, 0)
    const materials = [1, 2, 3, 4, 5, 6, 7, 8].map((faceValue) => {
      const texture = generateNumberTexture(faceValue, color.bgColor, color.dotColor)
      return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.3,
        metalness: 0.1,
        envMapIntensity: 0.5,
      })
    })
    const dice = new THREE.Mesh(geometry, materials)
    dice.castShadow = true
    dice.receiveShadow = true
    return dice
  },

  createBody(): CANNON.Body {
    const body = new CANNON.Body({
      mass: 1,
      material: physicsWorld.materials.dice,
    })
    const scaledVertices = OCTA_VERTICES.map((v) => new CANNON.Vec3(v.x * D8_SIZE, v.y * D8_SIZE, v.z * D8_SIZE))
    const shape = new CANNON.ConvexPolyhedron({
      vertices: scaledVertices,
      faces: OCTA_FACES,
    })
    body.addShape(shape)
    body.linearDamping = 0.3
    body.angularDamping = 0.4
    body.allowSleep = true
    body.sleepSpeedLimit = 0.1
    body.sleepTimeLimit = 0.5
    return body
  },

  faceNormals: D8_NORMALS,

  getFaceValue(faceIndex: number): number {
    return faceIndex + 1
  },

  dispose(mesh: THREE.Mesh): void {
    mesh.geometry.dispose()
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((m) => {
        if (m instanceof THREE.MeshStandardMaterial) m.map?.dispose()
        m.dispose()
      })
    }
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/three/dice/d8.ts
git commit -m "feat: add D8 octahedron dice definition"
```

---

### Task 6: 创建 d12.ts — 十二面体骰子

**Files:**
- Create: `src/lib/three/dice/d12.ts`

- [ ] **Step 1: 创建 d12.ts**

从 Three.js 的 DodecahedronGeometry 提取顶点和面数据：

```typescript
import * as THREE from 'three-platformize'
import * as CANNON from 'cannon-es'
import type { DiceColor, DiceDefinition } from './types'
import { generateNumberTexture } from './textures'
import { physicsWorld } from '@/lib/physics/world'

const D12_SIZE = 0.7

// 从 Three.js DodecahedronGeometry 提取数据
const dodecaGeo = new THREE.DodecahedronGeometry(D12_SIZE, 0)
const dodecaPositions = dodecaGeo.attributes.position
const dodecaIndex = dodecaGeo.index

// 提取唯一顶点
const vertexMap = new Map<string, number>()
const vertices: CANNON.Vec3[] = []
const faces: number[][] = []

for (let i = 0; i < dodecaPositions.count; i++) {
  const x = dodecaPositions.getX(i)
  const y = dodecaPositions.getY(i)
  const z = dodecaPositions.getZ(i)
  const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`
  if (!vertexMap.has(key)) {
    vertexMap.set(key, vertices.length)
    vertices.push(new CANNON.Vec3(x, y, z))
  }
}

if (dodecaIndex) {
  for (let i = 0; i < dodecaIndex.count; i += 3) {
    const a = dodecaIndex.getX(i)
    const b = dodecaIndex.getX(i + 1)
    const c = dodecaIndex.getX(i + 2)
    const ka = `${dodecaPositions.getX(a).toFixed(6)},${dodecaPositions.getY(a).toFixed(6)},${dodecaPositions.getZ(a).toFixed(6)}`
    const kb = `${dodecaPositions.getX(b).toFixed(6)},${dodecaPositions.getY(b).toFixed(6)},${dodecaPositions.getZ(b).toFixed(6)}`
    const kc = `${dodecaPositions.getX(c).toFixed(6)},${dodecaPositions.getY(c).toFixed(6)},${dodecaPositions.getZ(c).toFixed(6)}`
    faces.push([vertexMap.get(ka)!, vertexMap.get(kb)!, vertexMap.get(kc)!])
  }
}

dodecaGeo.dispose()

function computeFaceNormal(va: CANNON.Vec3, vb: CANNON.Vec3, vc: CANNON.Vec3): CANNON.Vec3 {
  const ab = new CANNON.Vec3()
  const ac = new CANNON.Vec3()
  va.vsub(vb, ab)
  va.vsub(vc, ac)
  const normal = new CANNON.Vec3()
  ab.cross(ac, normal)
  normal.normalize()
  return normal
}

const D12_NORMALS = faces.map((face) =>
  computeFaceNormal(vertices[face[0]], vertices[face[1]], vertices[face[2]])
)

export const D12Definition: DiceDefinition = {
  createMesh(color: DiceColor): THREE.Mesh {
    const geometry = new THREE.DodecahedronGeometry(D12_SIZE, 0)
    const materials = Array.from({ length: 12 }, (_, i) => {
      const texture = generateNumberTexture(i + 1, color.bgColor, color.dotColor)
      return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.3,
        metalness: 0.1,
        envMapIntensity: 0.5,
      })
    })
    const dice = new THREE.Mesh(geometry, materials)
    dice.castShadow = true
    dice.receiveShadow = true
    return dice
  },

  createBody(): CANNON.Body {
    const body = new CANNON.Body({
      mass: 1,
      material: physicsWorld.materials.dice,
    })
    const shape = new CANNON.ConvexPolyhedron({ vertices, faces })
    body.addShape(shape)
    body.linearDamping = 0.3
    body.angularDamping = 0.4
    body.allowSleep = true
    body.sleepSpeedLimit = 0.1
    body.sleepTimeLimit = 0.5
    return body
  },

  faceNormals: D12_NORMALS,

  getFaceValue(faceIndex: number): number {
    return faceIndex + 1
  },

  dispose(mesh: THREE.Mesh): void {
    mesh.geometry.dispose()
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((m) => {
        if (m instanceof THREE.MeshStandardMaterial) m.map?.dispose()
        m.dispose()
      })
    }
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/three/dice/d12.ts
git commit -m "feat: add D12 dodecahedron dice definition"
```

---

### Task 7: 创建 d20.ts — 二十面体骰子

**Files:**
- Create: `src/lib/three/dice/d20.ts`

- [ ] **Step 1: 创建 d20.ts**

与 D12 类似，从 Three.js IcosahedronGeometry 提取数据：

```typescript
import * as THREE from 'three-platformize'
import * as CANNON from 'cannon-es'
import type { DiceColor, DiceDefinition } from './types'
import { generateNumberTexture } from './textures'
import { physicsWorld } from '@/lib/physics/world'

const D20_SIZE = 0.7

const icoGeo = new THREE.IcosahedronGeometry(D20_SIZE, 0)
const icoPositions = icoGeo.attributes.position
const icoIndex = icoGeo.index

const vertexMap = new Map<string, number>()
const vertices: CANNON.Vec3[] = []
const faces: number[][] = []

for (let i = 0; i < icoPositions.count; i++) {
  const x = icoPositions.getX(i)
  const y = icoPositions.getY(i)
  const z = icoPositions.getZ(i)
  const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`
  if (!vertexMap.has(key)) {
    vertexMap.set(key, vertices.length)
    vertices.push(new CANNON.Vec3(x, y, z))
  }
}

if (icoIndex) {
  for (let i = 0; i < icoIndex.count; i += 3) {
    const a = icoIndex.getX(i)
    const b = icoIndex.getX(i + 1)
    const c = icoIndex.getX(i + 2)
    const ka = `${icoPositions.getX(a).toFixed(6)},${icoPositions.getY(a).toFixed(6)},${icoPositions.getZ(a).toFixed(6)}`
    const kb = `${icoPositions.getX(b).toFixed(6)},${icoPositions.getY(b).toFixed(6)},${icoPositions.getZ(b).toFixed(6)}`
    const kc = `${icoPositions.getX(c).toFixed(6)},${icoPositions.getY(c).toFixed(6)},${icoPositions.getZ(c).toFixed(6)}`
    faces.push([vertexMap.get(ka)!, vertexMap.get(kb)!, vertexMap.get(kc)!])
  }
}

icoGeo.dispose()

function computeFaceNormal(va: CANNON.Vec3, vb: CANNON.Vec3, vc: CANNON.Vec3): CANNON.Vec3 {
  const ab = new CANNON.Vec3()
  const ac = new CANNON.Vec3()
  va.vsub(vb, ab)
  va.vsub(vc, ac)
  const normal = new CANNON.Vec3()
  ab.cross(ac, normal)
  normal.normalize()
  return normal
}

const D20_NORMALS = faces.map((face) =>
  computeFaceNormal(vertices[face[0]], vertices[face[1]], vertices[face[2]])
)

export const D20Definition: DiceDefinition = {
  createMesh(color: DiceColor): THREE.Mesh {
    const geometry = new THREE.IcosahedronGeometry(D20_SIZE, 0)
    const materials = Array.from({ length: 20 }, (_, i) => {
      const texture = generateNumberTexture(i + 1, color.bgColor, color.dotColor)
      return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.3,
        metalness: 0.1,
        envMapIntensity: 0.5,
      })
    })
    const dice = new THREE.Mesh(geometry, materials)
    dice.castShadow = true
    dice.receiveShadow = true
    return dice
  },

  createBody(): CANNON.Body {
    const body = new CANNON.Body({
      mass: 1,
      material: physicsWorld.materials.dice,
    })
    const shape = new CANNON.ConvexPolyhedron({ vertices, faces })
    body.addShape(shape)
    body.linearDamping = 0.3
    body.angularDamping = 0.4
    body.allowSleep = true
    body.sleepSpeedLimit = 0.1
    body.sleepTimeLimit = 0.5
    return body
  },

  faceNormals: D20_NORMALS,

  getFaceValue(faceIndex: number): number {
    return faceIndex + 1
  },

  dispose(mesh: THREE.Mesh): void {
    mesh.geometry.dispose()
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((m) => {
        if (m instanceof THREE.MeshStandardMaterial) m.map?.dispose()
        m.dispose()
      })
    }
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/three/dice/d20.ts
git commit -m "feat: add D20 icosahedron dice definition"
```

---

### Task 8: 创建 dice/index.ts — DiceFactory 统一入口

**Files:**
- Create: `src/lib/three/dice/index.ts`

- [ ] **Step 1: 创建 index.ts**

```typescript
import type { DiceType, DiceDefinition, DiceColor, DiceTheme } from './types'
import { D4Definition } from './d4'
import { D6Definition } from './d6'
import { D8Definition } from './d8'
import { D12Definition } from './d12'
import { D20Definition } from './d20'

export type { DiceType, DiceColor, DiceTheme, DiceDefinition } from './types'
export { DICE_COLORS, DICE_THEMES } from './types'

const DEFINITIONS: Record<DiceType, DiceDefinition> = {
  D4: D4Definition,
  D6: D6Definition,
  D8: D8Definition,
  D12: D12Definition,
  D20: D20Definition,
}

export function getDiceDefinition(type: DiceType): DiceDefinition {
  return DEFINITIONS[type]
}

// Re-export individual definitions for direct access
export { D4Definition, D6Definition, D8Definition, D12Definition, D20Definition }
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/three/dice/index.ts
git commit -m "feat: add DiceFactory unified entry point"
```

---

### Task 9: 更新 physics/utils.ts — 通用 getTopFace

**Files:**
- Modify: `src/lib/physics/utils.ts`

- [ ] **Step 1: 添加通用 getTopFace 函数**

在现有 `getTopFaceD6` 基础上添加通用版本，保留旧函数向后兼容：

```typescript
// 在现有文件末尾添加

// 通用面检测：对任意骰子类型检测朝上的面
export function getTopFace(faceNormals: CANNON.Vec3[], body: CANNON.Body): number {
  const up = new CANNON.Vec3(0, 1, 0)
  let maxDot = -Infinity
  let topIndex = 0

  for (let i = 0; i < faceNormals.length; i++) {
    const worldNormal = body.quaternion.vmult(faceNormals[i])
    const dot = worldNormal.dot(up)
    if (dot > maxDot) {
      maxDot = dot
      topIndex = i
    }
  }

  return topIndex
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/physics/utils.ts
git commit -m "feat: add generic getTopFace for all dice types"
```

---

### Task 10: 更新 PhysicsDice 组件 — 接收 diceType prop

**Files:**
- Modify: `src/pages/dice/components/PhysicsDice.tsx`

- [ ] **Step 1: 修改 PhysicsDice 组件**

主要改动：
1. import 改为从 `@/lib/three/dice` 导入
2. Props 新增 `diceType: DiceType`
3. `initStaticDice` 根据 diceType 创建
4. `throwDice` 根据 diceType 创建碰撞体和网格
5. 结果检测用通用 `getTopFace` + `getFaceValue`

完整替换 `PhysicsDice.tsx` 内容（保持文件结构不变，只改内部逻辑）。

- [ ] **Step 2: Commit**

```bash
git add src/pages/dice/components/PhysicsDice.tsx
git commit -m "feat: PhysicsDice supports diceType prop for multi-dice"
```

---

### Task 11: 更新 DicePage — 移除 D10, 传递 diceType

**Files:**
- Modify: `src/pages/dice/index.tsx`

- [ ] **Step 1: 修改 DicePage**

改动：
1. `DICE_TYPES` 移除 D10
2. import 改为从 `@/lib/three/dice` 导入
3. PhysicsDice 组件传入 `diceType={selectedDice.key as DiceType}`

- [ ] **Step 2: Commit**

```bash
git add src/pages/dice/index.tsx
git commit -m "feat: DicePage passes diceType to PhysicsDice, remove D10"
```

---

### Task 12: 验证 — 类型检查 + lint + 功能测试

**Files:**
- Test: 整体功能验证

- [ ] **Step 1: 类型检查**

Run: `npx tsc --noEmit 2>&1 | grep -E "src/(lib/three|pages/dice)" | head -20`
Expected: 无错误（node_modules 的错误忽略）

- [ ] **Step 2: Lint 检查**

Run: `npx eslint src/lib/three/dice/ src/pages/dice/ 2>&1 | head -20`
Expected: 无错误

- [ ] **Step 3: 最终提交**

```bash
git add -A
git commit -m "feat: complete multi-dice type support (D4/D6/D8/D12/D20)"
```
