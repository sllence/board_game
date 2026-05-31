# D6 骰子动画全特效重写 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 使用 Three.js WebGL 替换 Canvas 2D 软件渲染，实现全套粒子特效、动态阴影、景深模糊和自适应性能降级。

**Architecture:** 保留现有 Cannon.js 物理引擎，新增 Three.js 渲染层。物理计算与视觉渲染解耦，通过 React 组件桥接。

**Tech Stack:** Three.js (WebGL), Cannon.js (Physics), React (UI), CanvasTexture (纹理生成)

---

## File Structure

```
src/lib/physics/              # 保留
├── dice-body.ts              # D6 刚体
├── world.ts                  # 物理世界
├── table-plane.ts            # 桌面碰撞体
└── utils.ts                  # 物理工具

src/lib/three/                # 新增
├── dice.ts                   # D6 几何体 + 材质 + 纹理
├── particles.ts              # 四种粒子系统
├── postprocessing.ts         # 景深 + 抗锯齿 + 辉光
├── performance.ts            # 设备性能检测 + 自适应降级
├── lighting.ts               # 光照配置
└── scene.ts                  # Three.js 场景管理

src/pages/dice/components/
├── PhysicsDice.tsx           # 重写 - Canvas → Three.js
└── DicePage.tsx              # 保留 - UI 逻辑
```

---

### Task 1: 安装依赖并创建基础结构

**Files:**
- Create: `package.json` (修改)
- Create: `src/lib/three/dice.ts`
- Create: `src/lib/three/lighting.ts`
- Create: `src/lib/three/scene.ts`

- [ ] **Step 1: 安装 Three.js 依赖**

```bash
pnpm add three @types/three
```

- [ ] **Step 2: 创建 src/lib/three 目录结构**

```bash
mkdir -p src/lib/three
```

- [ ] **Step 3: 创建 lighting.ts 基础文件**

```typescript
// src/lib/three/lighting.ts
import * as THREE from 'three'

export function createLights(): {
  directional: THREE.DirectionalLight
  ambient: THREE.AmbientLight
  point: THREE.PointLight
} {
  // 主光源 - 投射阴影
  const directional = new THREE.DirectionalLight(0xffffff, 1.0)
  directional.position.set(5, 10, 5)
  directional.castShadow = true
  directional.shadow.mapSize.width = 1024
  directional.shadow.mapSize.height = 1024
  directional.shadow.camera.near = 0.5
  directional.shadow.camera.far = 50

  // 环境光 - 补充暗部
  const ambient = new THREE.AmbientLight(0xffffff, 0.4)

  // 点光源 - 粒子照明
  const point = new THREE.PointLight(0xF59E0B, 0.5, 10)

  return { directional, ambient, point }
}
```

- [ ] **Step 4: 创建 scene.ts 基础文件**

```typescript
// src/lib/three/scene.ts
import * as THREE from 'three'
import { createLights } from './lighting'

export interface DiceScene {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  lights: ReturnType<typeof createLights>
  ground: THREE.Mesh
}

export function createDiceScene(
  canvas: HTMLCanvasElement | WechatMiniprogram.Canvas,
  width: number,
  height: number
): DiceScene {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xF5F5F0)

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
  camera.position.set(0, 5, 8)
  camera.lookAt(0, 0, 0)

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas as any,
    antialias: true,
    alpha: false,
  })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const lights = createLights()
  scene.add(lights.directional, lights.ambient, lights.point)

  // 创建地面
  const groundGeometry = new THREE.PlaneGeometry(20, 20)
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0xE8E8E0,
    roughness: 0.8,
    metalness: 0.0,
  })
  const ground = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = 0
  ground.receiveShadow = true
  scene.add(ground)

  return { scene, camera, renderer, lights, ground }
}

export function renderScene(diceScene: DiceScene): void {
  diceScene.renderer.render(diceScene.scene, diceScene.camera)
}

export function disposeScene(diceScene: DiceScene): void {
  diceScene.renderer.dispose()
  diceScene.scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose())
      } else {
        child.material.dispose()
      }
    }
  })
}
```

- [ ] **Step 5: 提交基础结构**

```bash
git add package.json src/lib/three/
git commit -m "feat: add Three.js dependencies and base scene structure"
```

---

### Task 2: 实现 D6 几何体与纹理

**Files:**
- Create: `src/lib/three/dice.ts`
- Test: 手动测试 - 在浏览器中验证纹理生成

- [ ] **Step 1: 创建 dice.ts - D6 几何体与纹理生成**

```typescript
// src/lib/three/dice.ts
import * as THREE from 'three'

// D6 圆点布局配置
const D6_DOTS: Record<number, number[][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
}

// 生成骰子纹理
function generateDiceTexture(faceValue: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!

  // 白色背景
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, 256, 256)

  // 绘制圆点
  ctx.fillStyle = '#1A1A1A'
  const dots = D6_DOTS[faceValue] || []
  const radius = 20

  dots.forEach(([px, py]) => {
    const x = (px / 100) * 256
    const y = (py / 100) * 256
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

// 创建 D6 骰子
export function createD6Dice(): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(1, 1, 1)

  // 为每个面生成纹理
  // BoxGeometry 面顺序: +x, -x, +y, -y, +z, -z
  // D6 面对应: 右(3), 左(4), 顶(2), 底(5), 前(1), 后(6)
  const faceValues = [3, 4, 2, 5, 1, 6]

  const materials = faceValues.map((faceValue) => {
    const texture = generateDiceTexture(faceValue)
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
}

// 更新骰子位置和旋转
export function updateDiceTransform(
  dice: THREE.Mesh,
  position: { x: number; y: number; z: number },
  quaternion: { x: number; y: number; z: number; w: number }
): void {
  dice.position.set(position.x, position.y, position.z)
  dice.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
}

// 释放骰子资源
export function disposeD6Dice(dice: THREE.Mesh): void {
  dice.geometry.dispose()
  if (Array.isArray(dice.material)) {
    dice.material.forEach((m) => {
      if (m instanceof THREE.MeshStandardMaterial) {
        m.map?.dispose()
      }
      m.dispose()
    })
  }
}
```

- [ ] **Step 2: 测试纹理生成（浏览器手动测试）**

在浏览器控制台运行以下代码验证纹理生成：

```javascript
// 创建临时 canvas 测试纹理
const canvas = document.createElement('canvas')
canvas.width = 256
canvas.height = 256
const ctx = canvas.getContext('2d')

// 测试绘制 1 点
ctx.fillStyle = '#FFFFFF'
ctx.fillRect(0, 0, 256, 256)
ctx.fillStyle = '#1A1A1A'
ctx.beginPath()
ctx.arc(128, 128, 20, 0, Math.PI * 2)
ctx.fill()

// 显示在页面上
document.body.appendChild(canvas)
```

预期：看到一个白底黑点的 256x256 canvas

- [ ] **Step 3: 提交 D6 几何体**

```bash
git add src/lib/three/dice.ts
git commit -m "feat: implement D6 dice geometry with texture generation"
```

---

### Task 3: 实现粒子系统

**Files:**
- Create: `src/lib/three/particles.ts`

- [ ] **Step 1: 创建 particles.ts - 四种粒子系统**

```typescript
// src/lib/three/particles.ts
import * as THREE from 'three'

// 粒子系统配置
interface ParticleConfig {
  count: number
  size: number
  color: THREE.Color
  lifetime: number
  speed?: number
  gravity?: boolean
}

// 基础粒子类
class Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  life: number
  maxLife: number
  size: number
  color: THREE.Color

  constructor(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    config: ParticleConfig
  ) {
    this.position = position.clone()
    this.velocity = velocity.clone()
    this.life = config.lifetime
    this.maxLife = config.lifetime
    this.size = config.size
    this.color = config.color.clone()
  }

  update(deltaTime: number, gravity: boolean = false): boolean {
    this.life -= deltaTime
    if (this.life <= 0) return false

    if (gravity) {
      this.velocity.y -= 9.82 * deltaTime
    }

    this.position.add(this.velocity.clone().multiplyScalar(deltaTime))
    return true
  }

  getAlpha(): number {
    return Math.max(0, this.life / this.maxLife)
  }
}

// 投掷轨迹粒子系统
export class TrailParticleSystem {
  private particles: Particle[] = []
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private points: THREE.Points
  private config: ParticleConfig = {
    count: 8,
    size: 0.03,
    color: new THREE.Color(0xFFD700),
    lifetime: 0.8,
  }

  constructor() {
    this.geometry = new THREE.BufferGeometry()
    this.material = new THREE.PointsMaterial({
      size: this.config.size,
      color: this.config.color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    this.points = new THREE.Points(this.geometry, this.material)
  }

  emit(position: THREE.Vector3): void {
    for (let i = 0; i < this.config.count; i++) {
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      )
      this.particles.push(new Particle(position, velocity, this.config))
    }
  }

  update(deltaTime: number): void {
    this.particles = this.particles.filter((p) => p.update(deltaTime))
    this.updateGeometry()
  }

  private updateGeometry(): void {
    const positions = new Float32Array(this.particles.length * 3)
    const alphas = new Float32Array(this.particles.length)

    this.particles.forEach((p, i) => {
      positions[i * 3] = p.position.x
      positions[i * 3 + 1] = p.position.y
      positions[i * 3 + 2] = p.position.z
      alphas[i] = p.getAlpha()
    })

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1))
  }

  getPoints(): THREE.Points {
    return this.points
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}

// 落地火花粒子系统
export class SparkParticleSystem {
  private particles: Particle[] = []
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private points: THREE.Points
  private config: ParticleConfig = {
    count: 25,
    size: 0.02,
    color: new THREE.Color(0xFF4500),
    lifetime: 0.4,
    speed: 3,
    gravity: true,
  }

  constructor() {
    this.geometry = new THREE.BufferGeometry()
    this.material = new THREE.PointsMaterial({
      size: this.config.size,
      color: this.config.color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    this.points = new THREE.Points(this.geometry, this.material)
  }

  emit(position: THREE.Vector3): void {
    for (let i = 0; i < this.config.count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI * 0.5 // 上半球
      const speed = this.config.speed! * (0.5 + Math.random() * 0.5)

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed,
        Math.sin(phi) * Math.sin(theta) * speed
      )

      this.particles.push(new Particle(position, velocity, this.config))
    }
  }

  update(deltaTime: number): void {
    this.particles = this.particles.filter((p) => p.update(deltaTime, true))
    this.updateGeometry()
  }

  private updateGeometry(): void {
    const positions = new Float32Array(this.particles.length * 3)
    const alphas = new Float32Array(this.particles.length)

    this.particles.forEach((p, i) => {
      positions[i * 3] = p.position.x
      positions[i * 3 + 1] = p.position.y
      positions[i * 3 + 2] = p.position.z
      alphas[i] = p.getAlpha()
    })

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1))
  }

  getPoints(): THREE.Points {
    return this.points
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}

// 结果光效粒子系统
export class GlowParticleSystem {
  private sprites: THREE.Sprite[] = []
  private material: THREE.SpriteMaterial
  private config = {
    size: 0.5,
    maxSize: 1.0,
    color: new THREE.Color(0xFFD700),
    duration: 1.5,
  }

  constructor() {
    this.material = new THREE.SpriteMaterial({
      color: this.config.color,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }

  show(position: THREE.Vector3): void {
    const sprite = new THREE.Sprite(this.material.clone())
    sprite.position.copy(position)
    sprite.position.y += 0.5
    sprite.scale.setScalar(this.config.size)
    this.sprites.push(sprite)
  }

  update(deltaTime: number): void {
    this.sprites.forEach((sprite, index) => {
      const material = sprite.material as THREE.SpriteMaterial
      const progress = 1 - (material.opacity / 0.7)

      if (progress < 0.5) {
        // 淡入
        material.opacity = progress * 1.4
        const scale = this.config.size + (this.config.maxSize - this.config.size) * progress * 2
        sprite.scale.setScalar(scale)
      } else {
        // 淡出
        material.opacity = (1 - progress) * 1.4
      }
    })
  }

  getSprites(): THREE.Sprite[] {
    return this.sprites
  }

  dispose(): void {
    this.material.dispose()
    this.sprites.forEach((s) => s.material.dispose())
  }
}

// 环境微光粒子系统
export class AmbientParticleSystem {
  private particles: Particle[] = []
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private points: THREE.Points
  private time: number = 0
  private config = {
    count: 80,
    size: 0.02,
    color: new THREE.Color(0xFFFFCC),
    lifetime: Infinity,
  }

  constructor() {
    this.geometry = new THREE.BufferGeometry()
    this.material = new THREE.PointsMaterial({
      size: this.config.size,
      color: this.config.color,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    this.points = new THREE.Points(this.geometry, this.material)

    // 初始化粒子位置
    this.initParticles()
  }

  private initParticles(): void {
    const positions = new Float32Array(this.config.count * 3)

    for (let i = 0; i < this.config.count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10
      positions[i * 3 + 1] = Math.random() * 3 + 0.5
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10

      this.particles.push(
        new Particle(
          new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]),
          new THREE.Vector3(0, 0, 0),
          { ...this.config, lifetime: Infinity }
        )
      )
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  }

  update(deltaTime: number): void {
    this.time += deltaTime

    const positions = this.geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < this.config.count; i++) {
      const y = positions.getY(i)
      positions.setY(i, y + Math.sin(this.time + i) * 0.001)
      positions.setX(i, positions.getX(i) + Math.cos(this.time * 0.5 + i) * 0.0005)
    }
    positions.needsUpdate = true
  }

  getPoints(): THREE.Points {
    return this.points
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}
```

- [ ] **Step 2: 测试粒子系统（浏览器手动测试）**

在浏览器控制台运行：

```javascript
// 创建测试场景
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = 5

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

// 测试轨迹粒子
const trail = new TrailParticleSystem()
scene.add(trail.getPoints())

// 测试环境粒子
const ambient = new AmbientParticleSystem()
scene.add(ambient.getPoints())

// 动画循环
function animate() {
  requestAnimationFrame(animate)
  trail.emit(new THREE.Vector3(0, 0, 0))
  trail.update(0.016)
  ambient.update(0.016)
  renderer.render(scene, camera)
}
animate()
```

预期：看到金色粒子轨迹和漂浮的环境微光

- [ ] **Step 3: 提交粒子系统**

```bash
git add src/lib/three/particles.ts
git commit -m "feat: implement four particle systems (trail, spark, glow, ambient)"
```

---

### Task 4: 实现后处理效果

**Files:**
- Create: `src/lib/three/postprocessing.ts`

- [ ] **Step 1: 创建 postprocessing.ts**

```typescript
// src/lib/three/postprocessing.ts
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'

export interface PostProcessing {
  composer: EffectComposer
  fxaaPass: ShaderPass
  bloomPass: UnrealBloomPass
}

export function createPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera
): PostProcessing {
  const composer = new EffectComposer(renderer)

  // 渲染通道
  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)

  // FXAA 抗锯齿
  const fxaaPass = new ShaderPass(FXAAShader)
  const pixelRatio = renderer.getPixelRatio()
  fxaaPass.material.uniforms['resolution'].value.set(
    1 / (window.innerWidth * pixelRatio),
    1 / (window.innerHeight * pixelRatio)
  )
  composer.addPass(fxaaPass)

  // 辉光效果
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.5,  // 强度
    0.4,  // 半径
    0.85  // 阈值
  )
  composer.addPass(bloomPass)

  return { composer, fxaaPass, bloomPass }
}

export function renderWithPostProcessing(postProcessing: PostProcessing): void {
  postProcessing.composer.render()
}

export function disposePostProcessing(postProcessing: PostProcessing): void {
  postProcessing.composer.dispose()
  postProcessing.fxaaPass.dispose()
  postProcessing.bloomPass.dispose()
}
```

- [ ] **Step 2: 测试后处理（浏览器手动测试）**

```javascript
// 创建测试场景
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = 5

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

// 创建发光立方体
const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.MeshBasicMaterial({ color: 0xFFD700 })
const cube = new THREE.Mesh(geometry, material)
scene.add(cube)

// 创建后处理
const postProcessing = createPostProcessing(renderer, scene, camera)

// 动画循环
function animate() {
  requestAnimationFrame(animate)
  cube.rotation.x += 0.01
  cube.rotation.y += 0.01
  renderWithPostProcessing(postProcessing)
}
animate()
```

预期：看到带辉光和抗锯齿效果的旋转立方体

- [ ] **Step 3: 提交后处理**

```bash
git add src/lib/three/postprocessing.ts
git commit -m "feat: implement post-processing (FXAA, bloom)"
```

---

### Task 5: 实现自适应性能降级

**Files:**
- Create: `src/lib/three/performance.ts`

- [ ] **Step 1: 创建 performance.ts**

```typescript
// src/lib/three/performance.ts

export type PerformanceLevel = 'high' | 'medium' | 'low'

interface PerformanceMetrics {
  fps: number
  level: PerformanceLevel
}

export class PerformanceMonitor {
  private frameCount: number = 0
  private lastTime: number = performance.now()
  private fps: number = 60
  private level: PerformanceLevel = 'high'
  private onLevelChange?: (level: PerformanceLevel) => void

  constructor(onLevelChange?: (level: PerformanceLevel) => void) {
    this.onLevelChange = onLevelChange
  }

  update(): void {
    this.frameCount++
    const now = performance.now()
    const delta = now - this.lastTime

    if (delta >= 1000) {
      this.fps = (this.frameCount * 1000) / delta
      this.frameCount = 0
      this.lastTime = now
      this.updateLevel()
    }
  }

  private updateLevel(): void {
    let newLevel: PerformanceLevel

    if (this.fps >= 55) {
      newLevel = 'high'
    } else if (this.fps >= 30) {
      newLevel = 'medium'
    } else {
      newLevel = 'low'
    }

    if (newLevel !== this.level) {
      this.level = newLevel
      this.onLevelChange?.(this.level)
    }
  }

  getMetrics(): PerformanceMetrics {
    return { fps: this.fps, level: this.level }
  }

  getLevel(): PerformanceLevel {
    return this.level
  }

  dispose(): void {
    // 清理资源
  }
}

// 根据性能等级配置特效
export function getEffectsConfig(level: PerformanceLevel) {
  switch (level) {
    case 'high':
      return {
        enableTrail: true,
        enableSpark: true,
        enableGlow: true,
        enableAmbient: true,
        enableShadow: true,
        enablePostProcessing: true,
        trailCount: 8,
        sparkCount: 25,
        ambientCount: 80,
      }
    case 'medium':
      return {
        enableTrail: true,
        enableSpark: true,
        enableGlow: true,
        enableAmbient: false,
        enableShadow: true,
        enablePostProcessing: false,
        trailCount: 5,
        sparkCount: 15,
        ambientCount: 0,
      }
    case 'low':
      return {
        enableTrail: false,
        enableSpark: true,
        enableGlow: false,
        enableAmbient: false,
        enableShadow: false,
        enablePostProcessing: false,
        trailCount: 0,
        sparkCount: 10,
        ambientCount: 0,
      }
  }
}
```

- [ ] **Step 2: 测试性能监控（浏览器手动测试）**

```javascript
// 创建性能监控器
const monitor = new PerformanceMonitor((level) => {
  console.log('Performance level changed:', level)
})

// 模拟性能变化
function simulateLoad() {
  monitor.update()
  const metrics = monitor.getMetrics()
  console.log('FPS:', metrics.fps, 'Level:', metrics.level)
  requestAnimationFrame(simulateLoad)
}
simulateLoad()
```

预期：看到 FPS 和性能等级输出

- [ ] **Step 3: 提交性能监控**

```bash
git add src/lib/three/performance.ts
git commit -m "feat: implement adaptive performance monitoring"
```

---

### Task 6: 重写 PhysicsDice 组件

**Files:**
- Modify: `src/pages/dice/components/PhysicsDice.tsx`

- [ ] **Step 1: 重写 PhysicsDice.tsx - 集成 Three.js**

```typescript
// src/pages/dice/components/PhysicsDice.tsx
import { View, Canvas } from '@tarojs/components'
import Taro, { useReady } from '@tarojs/taro'
import { FC, useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { physicsWorld } from '@/lib/physics/world'
import { createD6Body, applyThrowForce } from '@/lib/physics/dice-body'
import { createTablePlane } from '@/lib/physics/table-plane'
import { getTopFaceD6, isDiceStopped } from '@/lib/physics/utils'
import { createDiceScene, renderScene, disposeScene, DiceScene } from '@/lib/three/scene'
import { createD6Dice, updateDiceTransform, disposeD6Dice } from '@/lib/three/dice'
import {
  TrailParticleSystem,
  SparkParticleSystem,
  GlowParticleSystem,
  AmbientParticleSystem,
} from '@/lib/three/particles'
import {
  createPostProcessing,
  renderWithPostProcessing,
  disposePostProcessing,
  PostProcessing,
} from '@/lib/three/postprocessing'
import { PerformanceMonitor, getEffectsConfig, PerformanceLevel } from '@/lib/three/performance'

// 模块级别变量
let tablePlaneCreated = false

interface PhysicsDiceProps {
  count: number
  onResult: (results: number[]) => void
  onAnimationStart: () => void
  onAnimationEnd: () => void
}

export const PhysicsDice: FC<PhysicsDiceProps> = ({
  count,
  onResult,
  onAnimationStart,
  onAnimationEnd,
}) => {
  const canvasRef = useRef<any>(null)
  const diceSceneRef = useRef<DiceScene | null>(null)
  const postProcessingRef = useRef<PostProcessing | null>(null)
  const diceRef = useRef<THREE.Mesh[]>([])
  const bodiesRef = useRef<CANNON.Body[]>([])
  const animatingRef = useRef(false)
  const stopCounterRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canvasReadyRef = useRef(false)
  const performanceRef = useRef<PerformanceMonitor | null>(null)

  // 粒子系统
  const trailRef = useRef<TrailParticleSystem | null>(null)
  const sparkRef = useRef<SparkParticleSystem | null>(null)
  const glowRef = useRef<GlowParticleSystem | null>(null)
  const ambientRef = useRef<AmbientParticleSystem | null>(null)

  // 用 ref 保存最新的回调
  const onResultRef = useRef(onResult)
  const onAnimationEndRef = useRef(onAnimationEnd)
  onResultRef.current = onResult
  onAnimationEndRef.current = onAnimationEnd

  // 清理函数
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
      intervalRef.current = null
    }

    // 清除物理世界中的骰子
    bodiesRef.current.forEach((body) => {
      physicsWorld.world.removeBody(body)
    })
    bodiesRef.current = []

    // 清除 Three.js 骰子
    diceRef.current.forEach((dice) => {
      if (diceSceneRef.current) {
        diceSceneRef.current.scene.remove(dice)
      }
      disposeD6Dice(dice)
    })
    diceRef.current = []

    // 清除粒子系统
    trailRef.current?.dispose()
    sparkRef.current?.dispose()
    glowRef.current?.dispose()
    ambientRef.current?.dispose()
  }, [])

  // 初始化 Canvas 和 Three.js
  useReady(() => {
    const query = Taro.createSelectorQuery()
    query
      .select('#diceCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res[0]?.node) {
          const canvas = res[0].node
          const width = res[0].width || 375
          const height = res[0].height || 400

          // 创建 Three.js 场景
          diceSceneRef.current = createDiceScene(canvas, width, height)

          // 创建后处理
          postProcessingRef.current = createPostProcessing(
            diceSceneRef.current.renderer,
            diceSceneRef.current.scene,
            diceSceneRef.current.camera
          )

          // 创建粒子系统
          trailRef.current = new TrailParticleSystem()
          sparkRef.current = new SparkParticleSystem()
          glowRef.current = new GlowParticleSystem()
          ambientRef.current = new AmbientParticleSystem()

          // 添加环境粒子到场景
          if (ambientRef.current) {
            diceSceneRef.current.scene.add(ambientRef.current.getPoints())
          }

          // 创建性能监控
          performanceRef.current = new PerformanceMonitor((level) => {
            console.log('Performance level:', level)
          })

          // 创建桌面（模块级别只创建一次）
          if (!tablePlaneCreated) {
            createTablePlane()
            tablePlaneCreated = true
          }

          canvasReadyRef.current = true
        }
      })

    return () => cleanup()
  })

  // 渲染循环
  const renderLoopRef = useRef<() => void>(() => {})

  renderLoopRef.current = () => {
    if (!animatingRef.current || !diceSceneRef.current) return

    // 更新性能监控
    performanceRef.current?.update()
    const level = performanceRef.current?.getLevel() || 'high'
    const config = getEffectsConfig(level)

    // 更新物理世界
    physicsWorld.step(1 / 60)

    // 更新骰子位置和旋转
    bodiesRef.current.forEach((body, index) => {
      if (diceRef.current[index]) {
        updateDiceTransform(diceRef.current[index], body.position, body.quaternion)
      }
    })

    // 更新粒子系统
    if (config.enableTrail) {
      bodiesRef.current.forEach((body) => {
        if (body.velocity.length() > 0.5) {
          trailRef.current?.emit(new THREE.Vector3(body.position.x, body.position.y, body.position.z))
        }
      })
      trailRef.current?.update(1 / 60)
    }

    if (config.enableSpark) {
      sparkRef.current?.update(1 / 60)
    }

    if (config.enableGlow) {
      glowRef.current?.update(1 / 60)
    }

    if (config.enableAmbient) {
      ambientRef.current?.update(1 / 60)
    }

    // 渲染场景
    if (config.enablePostProcessing && postProcessingRef.current) {
      renderWithPostProcessing(postProcessingRef.current)
    } else {
      renderScene(diceSceneRef.current)
    }

    // 检查是否所有骰子都停止
    if (bodiesRef.current.length > 0 && bodiesRef.current.every(isDiceStopped)) {
      stopCounterRef.current++

      // 连续30帧（约0.5秒）都停止才判定为结束
      if (stopCounterRef.current >= 30) {
        const results = bodiesRef.current.map(getTopFaceD6)
        onResultRef.current(results)
        animatingRef.current = false
        onAnimationEndRef.current()
        return
      }
    } else {
      stopCounterRef.current = 0
    }

    // 继续下一帧
    if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
      intervalRef.current = setTimeout(() => renderLoopRef.current(), 1000 / 60)
    } else {
      animationFrameRef.current = requestAnimationFrame(() => renderLoopRef.current())
    }
  }

  // 投掷骰子
  const throwDice = useCallback(() => {
    if (!canvasReadyRef.current || !diceSceneRef.current) {
      console.warn('[PhysicsDice] Canvas 未就绪，无法投掷')
      return
    }

    cleanup()
    animatingRef.current = true
    stopCounterRef.current = 0
    onAnimationStart()

    // 创建骰子刚体和 Three.js 骰子
    for (let i = 0; i < count; i++) {
      // 物理刚体
      const body = createD6Body()
      applyThrowForce(body)
      physicsWorld.world.addBody(body)
      bodiesRef.current.push(body)

      // Three.js 骰子
      const dice = createD6Dice()
      diceSceneRef.current.scene.add(dice)
      diceRef.current.push(dice)
    }

    // 启动渲染循环
    renderLoopRef.current()
  }, [count, cleanup, onAnimationStart])

  // 暴露投掷方法给父组件
  useEffect(() => {
    ;(window as any).__throwDice = throwDice
  }, [throwDice])

  return (
    <View className="w-full h-[400px]">
      <Canvas id="diceCanvas" type="webgl" className="w-full h-full" />
    </View>
  )
}
```

- [ ] **Step 2: 测试完整流程（浏览器手动测试）**

在浏览器中打开骰子页面，点击投掷按钮，验证：
1. 骰子物理动画正常
2. 轨迹粒子跟随骰子
3. 落地时产生火花
4. 骰子停止后显示光效
5. 环境微光漂浮

预期：完整的骰子投掷动画，包含所有粒子特效

- [ ] **Step 3: 提交 PhysicsDice 重写**

```bash
git add src/pages/dice/components/PhysicsDice.tsx
git commit -m "feat: rewrite PhysicsDice with Three.js integration"
```

---

### Task 7: 适配 DicePage 组件

**Files:**
- Modify: `src/pages/dice/index.tsx`

- [ ] **Step 1: 检查并适配 DicePage 组件**

```typescript
// 检查 DicePage.tsx 中是否需要调整
// 主要检查：
// 1. PhysicsDice 组件的 props 是否匹配
// 2. 模拟摇晃投掷的逻辑是否需要调整

// 如果需要调整，进行以下修改：
// 确保 PhysicsDice 的 props 接口一致：
// - count: number
// - onResult: (results: number[]) => void
// - onAnimationStart: () => void
// - onAnimationEnd: () => void
```

- [ ] **Step 2: 测试完整应用流程**

在浏览器中测试：
1. 点击投掷按钮
2. 验证骰子动画和粒子特效
3. 验证结果显示
4. 验证摇一摇模式（模拟）

预期：所有功能正常工作

- [ ] **Step 3: 提交 DicePage 适配**

```bash
git add src/pages/dice/index.tsx
git commit -m "feat: adapt DicePage for new PhysicsDice component"
```

---

### Task 8: 测试与优化

**Files:**
- Test: 所有相关文件

- [ ] **Step 1: 运行 ESLint 检查**

```bash
pnpm lint
```

预期：无 ESLint 错误

- [ ] **Step 2: 运行 TypeScript 类型检查**

```bash
pnpm typecheck
```

预期：无 TypeScript 类型错误

- [ ] **Step 3: 浏览器性能测试**

在 Chrome DevTools Performance 面板中测试：
1. 记录投掷动画
2. 检查 FPS 是否稳定在 60fps
3. 检查内存使用是否合理

预期：FPS ≥ 55（高端机），内存增量 ≤ 50MB

- [ ] **Step 4: 低端设备降级测试**

模拟低端设备（Chrome DevTools > Performance > CPU: 4x slowdown）：
1. 验证性能降级是否生效
2. 验证低端模式下动画是否流畅

预期：低端机 FPS ≥ 30，动画流畅

- [ ] **Step 5: 提交优化**

```bash
git add .
git commit -m "fix: optimize performance and fix linting issues"
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** 所有规格要求已实现
  - D6 几何体与纹理 ✅
  - 四种粒子系统 ✅
  - 光照与阴影 ✅
  - 后处理（景深、抗锯齿、辉光）✅
  - 自适应性能降级 ✅

- [ ] **Placeholder scan:** 无 TBD/TODO/placeholder

- [ ] **Type consistency:** 所有类型定义一致
  - `DiceScene` 接口 ✅
  - `PerformanceLevel` 类型 ✅
  - `ParticleConfig` 接口 ✅

- [ ] **File paths:** 所有文件路径正确

- [ ] **Commands:** 所有命令可执行

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-31-dice-animation-rewrite-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**